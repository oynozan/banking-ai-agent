interface Props {
    isUserMessage: boolean;
    text: string;
}

export default function Message({ isUserMessage, text }: Props) {

    return (
        <div className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-b-2xl max-w-xs ${isUserMessage ? 'bg-[#13181a] text-gray-200 rounded-tl-2xl' : 'bg-[#002e3c] text-white rounded-tr-2xl'}`}>
                <p>{text}</p>
            </div>
        </div>
    )
}