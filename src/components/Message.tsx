import React from 'react';
import {date as dateFormat} from '../utils/format'
export type MessageProps = {
  text: string;
  date: Date;
  reply: boolean;
};

export default function Message({text, date, reply}: MessageProps) {
  return <div className={`message ${reply ? 'reply': ''}`} title={dateFormat(date)}>
    <div className='message-bubble'>
      {/* <div className='date'>{dateFormat(date)}</div> */}
      <div className='text'>{text}</div>
    </div>
  </div>;
}
