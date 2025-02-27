import React from 'react';
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  // useNavigate,
} from 'react-router-dom';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import Chat from './components/Chat';
import UserForm from './components/UserForm';
import {
  Interaction,
  User,
  PublicKeyInteraction,
  Dict,
  MessageInteraction,
} from './interfaces';
import { servicesConfig } from './utils/config';

function App() {
  const [year] = React.useState(new Date().getFullYear());
  const [connection, setConnection] = React.useState<HubConnection>();
  const [users, setUsers] = React.useState<Dict<User>>({});
  const [user, setUser] = React.useState('');

  const [publicKey, setPublicKey] = React.useState('');
  const [privateKey, setPrivateKey] = React.useState<CryptoKey>();

  // const navigate = useNavigate();

  React.useEffect(() => {
    (async () => {
      try {
        const key = await window.crypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: 'SHA-256' },
          },
          true,
          ['encrypt', 'decrypt']
        );
        const keyData = JSON.stringify(
          await window.crypto.subtle.exportKey('jwk', key.publicKey)
        );
        setPublicKey(keyData);
        setPrivateKey(key.privateKey);
      } catch (err) {
        console.error(err);
      }
    })();

    const newConnection = new HubConnectionBuilder()
      .withUrl(servicesConfig.chathub)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, []);

  const onListUsers = React.useCallback(
    (usernames: Array<string>) => {
      console.log('usernames', usernames);
      console.log('users', users);
      const updated = usernames.reduce(
        (response, name) => ({
          ...response,
          [name]: {
            name,
            picture: getPic(name),
            messages: users[name]?.messages || [],
          },
        }),
        {} as Dict<User>
      );
      console.log('updated users', updated);
      setUsers(updated);
    },
    [users, setUsers]
  );

  const onRequestedPublicKey = React.useCallback(
    async (interaction: Interaction) => {
      console.log('RequestedPublicKey', interaction, user || 'nulo');
      await connection!.send('SendPublicKey', interaction.fromUser, publicKey);
    },
    [user, publicKey, connection]
  );

  const onReceivedPublicKey = React.useCallback(
    async (interaction: PublicKeyInteraction) => {
      console.log('ReceivedPublicKey', interaction);
      try {
        const key = JSON.parse(interaction.publicKey) as JsonWebKey;
        console.log('key', key);
        const importedKey = await window.crypto.subtle.importKey(
          'jwk',
          key,
          {
            name: 'RSA-OAEP',
            hash: { name: 'SHA-256' },
          },
          false,
          ['encrypt']
        );

        setUsers((_users) => ({
          ..._users,
          [interaction.fromUser]: {
            ..._users[interaction.fromUser],
            publicKey: importedKey,
          },
        }));
      } catch (error) {
        console.error(error);
      }
    },
    [setUsers]
  );

  const onReceivedMessage = React.useCallback(
    async (interaction: MessageInteraction) => {
      try {
        console.log('users', users);
        const message = await window.crypto.subtle.decrypt(
          {
            name: 'RSA-OAEP',
          },
          privateKey!,
          Uint8Array.from(interaction.message)
        );
        const text = new TextDecoder().decode(message);
        const updated = {
          ...users,
          [interaction.fromUser]: {
            ...(users[interaction.fromUser] || { messages: [] }),
            messages: [
              ...users[interaction.fromUser].messages,
              {
                date: new Date(),
                reply: false,
                text,
              },
            ],
          },
        };
        setUsers(updated);
        console.log('updated: ', updated);
      } catch (error) {
        console.log(error);
      }
    },
    [users, privateKey, setUsers]
  );

  React.useEffect(() => {
    if (connection && user) {
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.on('ListUsers', onListUsers);
        connection.on('RequestedPublicKey', onRequestedPublicKey);
        connection.on('ReceivedPublicKey', onReceivedPublicKey);
        connection.on('ReceivedMessage', onReceivedMessage);
      } else {
        console.log('Going to init!', connection.state);
        connection
          .start()
          .then(() => {
            connection.on('ListUsers', onListUsers);
            connection.on('RequestedPublicKey', onRequestedPublicKey);
            connection.on('ReceivedPublicKey', onReceivedPublicKey);
            connection.on('ReceivedMessage', onReceivedMessage);
            connection.send('Init', user);
          })
          .catch((e) => console.log('Connection failed: ', e));
      }

      return () => {
        connection.off('ListUsers');
        connection.off('RequestedPublicKey');
        connection.off('ReceivedPublicKey');
        connection.off('ReceivedMessage');
      };
    }
  }, [
    connection,
    user,
    onListUsers,
    onRequestedPublicKey,
    onReceivedPublicKey,
    onReceivedMessage,
  ]);

  const sendMessageHandler = React.useCallback(
    async (toUser: string, message: string) => {
      if (connection?.state === HubConnectionState.Connected) {
        try {
          if (typeof users[toUser].publicKey === 'undefined') {
            alert('Connection not secured yet.');
          }
          const data = await window.crypto.subtle.encrypt(
            {
              name: 'RSA-OAEP',
            },
            users[toUser].publicKey!,
            new TextEncoder().encode(message)
          );
          await connection.send(
            'SendMessage',
            toUser,
            Array.from(new Uint8Array(data))
          );
          setUsers((_users) => ({
            ..._users,
            [toUser]: {
              ..._users[toUser],
              messages: [
                ..._users[toUser].messages,
                {
                  date: new Date(),
                  reply: true,
                  text: message,
                },
              ],
            },
          }));
        } catch (e) {
          console.log(e);
        }
      } else {
        alert('No connection to server yet.');
      }
    },
    [connection, users, setUsers]
  );

  const startConversationHandler = React.useCallback(
    async (toUser: string) => {
      if (connection?.state === HubConnectionState.Connected) {
        try {
          await connection.send('StartConversation', toUser);
        } catch (e) {
          console.error(e);
        }
      } else {
        alert('No connection to server yet.');
      }
    },
    [connection]
  );

  const getPic = (name: string) =>
    `${servicesConfig.avatars}/20/${name.toLowerCase()}.png`;

  const isNavigationActiveClass = ({ isActive }: { isActive: boolean }) =>
    `app-navigation-item ${isActive ? 'selected' : ''}`;

  const onSetUserHandler = async (user: string) => {
    setUser(user);
  };

  return (
    <div className='app'>
      <header>
        <h2>Welcome {user ? ` ${user}` : ''} to the live chat!</h2>
      </header>
      <main className='app-main'>
        <Routes>
          <Route path='/' element={<UserForm onSetUser={onSetUserHandler} />} />
          <Route
            path='/rooms'
            element={
              <React.Fragment>
                {!user && <Navigate to='/' />}
                <div className='app-navigation-items'>
                  {Object.keys(users)
                    .filter((u) => u !== user)
                    .map((name) => (
                      <NavLink
                        key={name}
                        className={isNavigationActiveClass}
                        to={`/rooms/room/${name}`}
                      >
                        <img
                          className='profile-pic'
                          src={users[name].picture}
                          alt={`${name} profile pic`}
                        />{' '}
                        {name}
                      </NavLink>
                    ))}
                </div>
                <div className='app-navigation-content'>
                  <Outlet />
                </div>
              </React.Fragment>
            }
          >
            <Route
              path='/rooms/room/:user'
              element={
                <Chat
                  users={users}
                  sendMessageHandler={sendMessageHandler}
                  startConversationHandler={startConversationHandler}
                />
              }
            />
          </Route>
        </Routes>
      </main>
      <footer>
        <small>&copy; {year} Juan Sebastián Montoya. All Rights Reserved</small>
      </footer>
    </div>
  );
}

export default App;
