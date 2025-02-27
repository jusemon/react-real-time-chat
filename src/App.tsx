import React from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import Chat from './components/Chat';
import UserForm from './components/UserForm';
import { User } from './interfaces';
import { useChatConnection } from './hooks/useChatConnection';

function App() {
  const [year] = React.useState(new Date().getFullYear());
  const [users, setUsers] = React.useState<Record<string, User>>({});
  const [user, setUser] = React.useState('');

  const { sendMessage, startConversation } = useChatConnection({
    username: user,
    users,
    setUsers,
  });

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
                          width={20}
                          height={20}
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
                  sendMessageHandler={sendMessage}
                  startConversationHandler={startConversation}
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
