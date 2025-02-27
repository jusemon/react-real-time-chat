import { useState, useEffect, useCallback } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import {
  Interaction,
  User,
  PublicKeyInteraction,
  MessageInteraction,
} from '../interfaces';
import { servicesConfig } from '../utils/config';

interface UseChatConnectionProps {
  username: string;
  users: Record<string, User>;
  setUsers: React.Dispatch<React.SetStateAction<Record<string, User>>>;
}

interface UseChatConnectionReturn {
  connection: HubConnection | undefined;
  publicKey: string | undefined;
  privateKey: CryptoKey | undefined;
  sendMessage: (toUser: string, message: string) => Promise<void>;
  startConversation: (toUser: string) => Promise<void>;
}

export function useChatConnection({
  username,
  users,
  setUsers,
}: UseChatConnectionProps): UseChatConnectionReturn {
  const [connection, setConnection] = useState<HubConnection>();
  const [publicKey, setPublicKey] = useState<string>();
  const [privateKey, setPrivateKey] = useState<CryptoKey>();

  const getPic = useCallback(
    (name: string) =>
      `${servicesConfig.avatars}/${name.toLowerCase()}.png&size=20`,
    []
  );

  useEffect(() => {
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

  const onListUsers = useCallback(
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
        {} as Record<string, User>
      );
      console.log('updated users', updated);
      setUsers(updated);
    },
    [users, setUsers, getPic]
  );

  const onRequestedPublicKey = useCallback(
    async (interaction: Interaction) => {
      console.log('RequestedPublicKey', interaction, username || 'nulo');
      if (connection && connection.state === HubConnectionState.Connected) {
        await connection.send('SendPublicKey', interaction.fromUser, publicKey);
      }
    },
    [username, publicKey, connection]
  );

  const onReceivedPublicKey = useCallback(
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

  const onReceivedMessage = useCallback(
    async (interaction: MessageInteraction) => {
      try {
        console.log('users', users);
        if (!privateKey) {
          console.error('Private key not available');
          return;
        }

        const message = await window.crypto.subtle.decrypt(
          {
            name: 'RSA-OAEP',
          },
          privateKey,
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

  useEffect(() => {
    if (connection && username) {
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
            connection.send('Init', username);
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
    username,
    onListUsers,
    onRequestedPublicKey,
    onReceivedPublicKey,
    onReceivedMessage,
  ]);

  const sendMessage = useCallback(
    async (toUser: string, message: string) => {
      if (connection?.state === HubConnectionState.Connected) {
        try {
          if (typeof users[toUser].publicKey === 'undefined') {
            alert('Connection not secured yet.');
            return;
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

  const startConversation = useCallback(
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

  return {
    connection,
    publicKey,
    privateKey,
    sendMessage,
    startConversation,
  };
}
