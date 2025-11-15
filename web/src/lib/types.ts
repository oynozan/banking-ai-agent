type AccountTypes = "id" | "iban";

export interface IUser {
    id: string;
    name: string;
    balance: number;
}

export interface ITransaction {
    _id: string;
    isSent: boolean; // true: sent by user; false: received by user
    participants: {
        sender: string;
        receiver: string;
        senderName?: string;
        receiverName?: string;
        senderType?: AccountTypes;
        receiverType?: AccountTypes;
    };
    amount: number;
    date: Date;
    type: "credit" | "debit" | "internal_transfer" | "external_transfer";
    category: string;
}
