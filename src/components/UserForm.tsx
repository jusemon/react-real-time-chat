import React from 'react';
import { useNavigate } from 'react-router-dom';

type UserFormProps = {
  user?: string;
  onSetUser: (user: string) => Promise<void>;
};

export default function UserForm({ user: _user, onSetUser }: UserFormProps) {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(_user || '');

  const onNextClick = () => {
    onSetUser(user);
    navigate('/rooms');
  };

  return (
    <div className='user-form'>
      <label htmlFor='name'>Enter your name</label>
      <input
        id='name'
        type='text'
        value={user}
        onChange={({ target: { value } }) => setUser(value)}
      />
      <button onClick={()=> onNextClick()}>Next</button>
    </div>
  );
}
