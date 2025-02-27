export type Message = {
  text: string;
  date: Date;
  reply: boolean;
};

export type User = {
  name: string;
  picture: string;
  messages: Array<Message>;
  publicKey?: CryptoKey;
};

export type Interaction = {
  fromUser: string;
  toUser: string;
};

export type MessageInteraction = Interaction & {
  message: Array<number>;
};

export type PublicKeyInteraction = Interaction & {
  publicKey: string;
};
