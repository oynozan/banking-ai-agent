import clsx from "clsx";
import React from "react";

export default function Message({ message, isUser }: { message: string; isUser: boolean }) {
    console.log("message", message);
    return (
        <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={`max-w-4/5 border p-4 rounded-[12px] wrap-break-word ${
                    isUser
                        ? "bg-[#f8cb00] border-[#f8c200] text-black rounded-tr-none"
                        : "bg-[#13181a] border-[#1c1c1c] text-white rounded-tl-none"
                }`}
            >
                <p>
                    <SafeTextWithBreaks text={message} />
                </p>
            </div>
        </div>
    );
}

const SafeTextWithBreaks = ({ text }: { text: string }) => {
    const normalized = React.useMemo(() => text.replace(/\\n/g, "\n"), [text]);
    const lines = React.useMemo(() => normalized.split(/\r?\n/g), [normalized]);

    return lines.map((line, i) => (
        <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
        </React.Fragment>
    ));
};
