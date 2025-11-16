import Contacts from "../../models/Contacts";
import Users from "../../models/Users";

export type FastContact = {
    alias: string;
    name?: string;
    iban: string;
};

export default class ContactLib {
    static async listContacts(userId: string): Promise<FastContact[]> {
        if (!userId) return [];
        const docs = await Contacts.find({ "user.id": userId }).lean();
        return docs.map(doc => ({
            alias: doc.contactAlias,
            name: doc.contactName,
            iban: doc.iban,
        }));
    }

    static async addContact(params: {
        userId: string;
        alias: string;
        iban: string;
        name?: string;
    }): Promise<FastContact | null> {
        const { userId, alias, iban, name } = params;
        if (!userId || !alias || !iban) return null;

        const user = await Users.findOne({ id: userId }).select("id name").lean();
        if (!user) return null;

        const aliasLower = alias.toLowerCase().trim();
        const created = await Contacts.findOneAndUpdate(
            { "user.id": userId, aliasLower },
            {
                $setOnInsert: {
                    user: { id: userId, name: user.name },
                    contactAlias: alias,
                    aliasLower,
                    iban,
                    contactName: name,
                },
            },
            { new: true, upsert: true },
        ).lean();

        return created
            ? { alias: created.contactAlias, name: created.contactName, iban: created.iban }
            : null;
    }

    static async findByAlias(userId: string, alias: string): Promise<FastContact | null> {
        const doc = await Contacts.findOne({
            "user.id": userId,
            aliasLower: alias.toLowerCase().trim(),
        }).lean();
        if (!doc) return null;
        return { alias: doc.contactAlias, name: doc.contactName, iban: doc.iban };
    }
}


