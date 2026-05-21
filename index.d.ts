declare module "*.scss" {
  const content: string;
  export = content;
}

declare module "serve-handler" {
  import { IncomingMessage, ServerResponse } from "node:http";
  interface Options {
    public?: string;
    cleanUrls?: boolean;
    rewrites?: Array<{ source: string; destination: string }>;
    redirects?: Array<{ source: string; destination: string }>;
    headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    directoryListing?: boolean;
    unlisted?: string[];
    trailingSlash?: boolean;
    renderSingle?: boolean;
    symlinks?: boolean;
  }
  export default function handler(
    request: IncomingMessage,
    response: ServerResponse,
    options?: Options,
  ): void;
}

// dom custom event
interface CustomEventMap {
  prenav: CustomEvent<{}>;
  nav: CustomEvent<{ url: FullSlug }>;
  themechange: CustomEvent<{ theme: "light" | "dark" }>;
  readermodechange: CustomEvent<{ mode: "on" | "off" }>;
}

type ContentIndex = Record<FullSlug, ContentDetails>;
declare const fetchData: Promise<ContentIndex>;
