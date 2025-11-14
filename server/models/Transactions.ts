import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

type AccountTypes = "id" | "iban";

export interface ITransaction extends Document {
    _id: Types.ObjectId;
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
    type: "credit" | "debit";
    category: string;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        isSent: { type: Boolean, required: true },
        participants: {
            sender: { type: String, required: true },
            receiver: { type: String, required: true },
            senderName: { type: String },
            receiverName: { type: String },
            senderType: { type: String, enum: ["id", "iban"] },
            receiverType: { type: String, enum: ["id", "iban"] },
        },
        amount: { type: Number, required: true },
        date: { type: Date, required: true },
        type: { type: String, enum: ["credit", "debit"], required: true },
        category: { type: String, required: true },
    },
    { versionKey: false }
);

const Transaction: Model<ITransaction> =
    mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);
export default Transaction;
