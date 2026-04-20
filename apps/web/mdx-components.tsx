import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: (props: ComponentPropsWithoutRef<"h1">) => (
      <h1 className="text-3xl font-bold text-white mt-0 mb-6" {...props} />
    ),
    h2: (props: ComponentPropsWithoutRef<"h2">) => (
      <h2 className="text-xl font-semibold text-white mt-10 mb-4 pb-2 border-b border-slate-800" {...props} />
    ),
    h3: (props: ComponentPropsWithoutRef<"h3">) => (
      <h3 className="text-base font-semibold text-slate-200 mt-7 mb-3" {...props} />
    ),
    p: (props: ComponentPropsWithoutRef<"p">) => (
      <p className="text-slate-300 leading-7 mb-4" {...props} />
    ),
    a: (props: ComponentPropsWithoutRef<"a">) => (
      <a className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors" {...props} />
    ),
    ul: (props: ComponentPropsWithoutRef<"ul">) => (
      <ul className="text-slate-300 space-y-1.5 mb-4 ml-4 list-disc marker:text-violet-500" {...props} />
    ),
    ol: (props: ComponentPropsWithoutRef<"ol">) => (
      <ol className="text-slate-300 space-y-1.5 mb-4 ml-4 list-decimal marker:text-violet-500" {...props} />
    ),
    li: (props: ComponentPropsWithoutRef<"li">) => (
      <li className="leading-7 pl-1" {...props} />
    ),
    code: ({ children, className, ...props }: ComponentPropsWithoutRef<"code">) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code className={`${className} text-sm`} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="bg-slate-800 text-violet-300 text-[0.85em] px-1.5 py-0.5 rounded font-mono" {...props}>
          {children}
        </code>
      );
    },
    pre: (props: ComponentPropsWithoutRef<"pre">) => (
      <pre
        className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 overflow-x-auto text-sm leading-relaxed mb-6 text-slate-200 font-mono"
        {...props}
      />
    ),
    table: ({ children, ...props }: ComponentPropsWithoutRef<"table">) => (
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse" {...props}>{children}</table>
      </div>
    ),
    thead: (props: ComponentPropsWithoutRef<"thead">) => <thead className="border-b border-slate-700" {...props} />,
    th: (props: ComponentPropsWithoutRef<"th">) => (
      <th className="text-left text-slate-400 font-semibold py-2 px-3 text-xs uppercase tracking-wider" {...props} />
    ),
    td: (props: ComponentPropsWithoutRef<"td">) => (
      <td className="text-slate-300 py-2 px-3 border-b border-slate-800/60" {...props} />
    ),
    tr: (props: ComponentPropsWithoutRef<"tr">) => <tr className="hover:bg-slate-800/30 transition-colors" {...props} />,
    blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
      <blockquote className="border-l-2 border-violet-500 pl-4 my-4 text-slate-400 italic" {...props} />
    ),
    hr: () => <hr className="border-slate-800 my-8" />,
  };
}
