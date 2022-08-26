export interface Dict<T> {
    [key: string]: T
}

export interface Message {
  text: string;
  date: Date;
  reply: boolean;
}

export interface User {
  name: string;
  picture: string;
  messages: Array<Message>;
  publicKey?: CryptoKey,
}

export interface Interaction {
  fromUser: string;
  toUser: string;
}

export interface MessageInteraction extends Interaction {
  message: Array<number>;
}

export interface PublicKeyInteraction extends Interaction {
  publicKey: string;
}
