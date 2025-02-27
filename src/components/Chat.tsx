import React from 'react';
import { useParams } from 'react-router-dom';
import { IoMdSend } from 'react-icons/io';
import Message from './Message';
import { User } from '../interfaces';
import { servicesConfig } from '../utils/config';

export type ChatProps = {
  users: Record<string, User>;
  sendMessageHandler: (toUser: string, message: string) => Promise<void>;
  startConversationHandler: (toUser: string) => Promise<void>;
};

export default function Chat({
  users,
  sendMessageHandler,
  startConversationHandler,
}: ChatProps) {
  const { user } = useParams();
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    console.log('start Conversation', user);
    if (user) {
      startConversationHandler(user);
    }
  }, [user, startConversationHandler]);

  const onSendMessageClick = async () => {
    if (message.length === 0) {
      return;
    }
    await sendMessageHandler(user!, message);
    setMessage('');
  };

  const getPic = (name: string) =>
    `${servicesConfig.avatars}/${name.toLowerCase()}.png&size=20`;

  return (
    <div className='chat'>
      <div className='profile'>
        <img
          className='profile-pic'
          src={getPic(user!)}
          alt=''
          width={20}
          height={20}
        />{' '}
        {user}
      </div>
      <div className='messages'>
        {user &&
          users[user].messages &&
          users[user].messages.map((message, index) => (
            <Message key={index} {...message} />
          ))}
      </div>
      <div className='message-form'>
        <input
          type='text'
          className='form-input'
          value={message}
          onChange={({ target: { value } }) => setMessage(value)}
        />
        <IoMdSend
          className='btn-icon primary'
          onClick={() => onSendMessageClick()}
        />
      </div>
    </div>
  );
}
