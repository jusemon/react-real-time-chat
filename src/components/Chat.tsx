import React from 'react';
import { useParams } from 'react-router-dom';
import { IoMdSend } from 'react-icons/io';
import Message from './Message';
import { Dict, User } from '../interfaces';

export type ChatProps = {
  users: Dict<User>;
  sendMessageHandler: (toUser: string, message: string) => Promise<void>;
  startConversationHandler: (toUser: string) => Promise<void>;
};

export default function Chat({
  users,
  sendMessageHandler,
  startConversationHandler,
}: ChatProps) {
  const { user } = useParams();
  const [messages] = React.useState(users[user || '']?.messages);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    console.log('start Conversation', user)
    if (user) {
      startConversationHandler(user);
    }
  }, [user]);

  const onSendMessageClick = async () => {
    await sendMessageHandler(user!, message);
  };

  return (
    <div>
      <div className='messages'>
        {messages &&
          messages.map((message, index) => (
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
