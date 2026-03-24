import {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "./types";
import SearchConstructor from "./Search";
import DarkmodeConstructor from "./Darkmode";
import ReaderModeConstructor from "./ReaderMode";
import style from "./styles/topControls.scss";
// @ts-ignore
import script from "./scripts/topControls.inline";
import { concatenateResources } from "../util/resources";
import { classNames } from "../util/lang";
import { i18n } from "../i18n";

interface Options {
  showReaderMode: boolean;
}

const defaultOptions: Options = {
  showReaderMode: false,
};

const Search = SearchConstructor();
const Darkmode = DarkmodeConstructor();
const ReaderMode = ReaderModeConstructor();

let numTopControls = 0;
export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts };

  const TopControls: QuartzComponent = (props: QuartzComponentProps) => {
    const { fileData, displayClass, cfg } = props;
    const hasToc = !!fileData.toc?.length;
    const tocId = `responsive-toc-${numTopControls++}`;
    const tocTitle = i18n(cfg.locale).components.tableOfContents.title;

    return (
      <div
        class={classNames(
          displayClass,
          "top-controls",
          hasToc ? "has-toc" : "no-toc",
        )}
      >
        <div class="top-controls-row">
          <div class="top-controls-search">
            <Search {...props} />
          </div>
          {hasToc && (
            <button
              type="button"
              class="toc-trigger"
              aria-controls={tocId}
              aria-expanded={false}
              aria-label={tocTitle}
              title={tocTitle}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="9" x2="20" y1="6" y2="6"></line>
                <line x1="9" x2="20" y1="12" y2="12"></line>
                <line x1="9" x2="20" y1="18" y2="18"></line>
                <circle cx="5" cy="6" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
                <circle cx="5" cy="18" r="1"></circle>
              </svg>
            </button>
          )}
          <Darkmode {...props} />
          {opts.showReaderMode && <ReaderMode {...props} />}
        </div>
        {hasToc && (
          <div
            id={tocId}
            class="responsive-toc-panel collapsed"
            aria-hidden={true}
          >
            <h3 class="responsive-toc-title">{tocTitle}</h3>
            <div class="responsive-toc-scroll-shell">
              <ul class="responsive-toc-list">
                {fileData.toc!.map((tocEntry) => (
                  <li key={tocEntry.slug} class={`depth-${tocEntry.depth}`}>
                    <a href={`#${tocEntry.slug}`} data-for={tocEntry.slug}>
                      {tocEntry.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  TopControls.css = concatenateResources(
    style,
    Search.css,
    Darkmode.css,
    ReaderMode.css,
  );
  TopControls.beforeDOMLoaded = concatenateResources(
    Search.beforeDOMLoaded,
    Darkmode.beforeDOMLoaded,
    ReaderMode.beforeDOMLoaded,
  );
  TopControls.afterDOMLoaded = concatenateResources(
    Search.afterDOMLoaded,
    ReaderMode.afterDOMLoaded,
    script,
  );

  return TopControls;
}) satisfies QuartzComponentConstructor<Partial<Options>>;
