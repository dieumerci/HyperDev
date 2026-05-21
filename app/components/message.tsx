import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  role: "user" | "assistant";
  content: string;
};

export function Message({ role, content }: Props) {
  if (role === "user") {
    return (
      <li className="self-end whitespace-pre-wrap rounded-lg bg-neutral-900 px-4 py-3 text-sm leading-relaxed text-white">
        {content}
      </li>
    );
  }

  return (
    <li className="prose prose-sm max-w-none self-start rounded-lg bg-white px-4 py-3 text-sm leading-relaxed text-neutral-900 ring-1 ring-neutral-200 prose-pre:bg-neutral-900 prose-pre:text-neutral-50">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </li>
  );
}
