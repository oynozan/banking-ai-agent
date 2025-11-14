import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface ISettings extends Document {
    _id: Types.ObjectId;
    userId: string;
    moneyTransferLimit: number;
    cardSpendingLimit: number;
}

const SettingsSchema = new Schema<ISettings>(
    {
        userId: { type: String, required: true, unique: true },
        moneyTransferLimit: { type: Number, required: true },
        cardSpendingLimit: { type: Number, required: true },
    },
    { versionKey: false }
);

const Settings: Model<ISettings> =
    mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);
export default Settings;
