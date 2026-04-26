import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface ResourceFrameHandle {
  print: () => void;
}

interface Props {
  html: string;
  title: string;
  className?: string;
}

const ResourceFrame = forwardRef<ResourceFrameHandle, Props>(function ResourceFrame(
  { html, title, className },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(800);

  useImperativeHandle(
    ref,
    () => ({
      print: () => {
        const win = iframeRef.current?.contentWindow;
        if (win) {
          win.focus();
          win.print();
        }
      },
    }),
    [],
  );

  function measure() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const h = Math.max(
      doc.documentElement.scrollHeight,
      doc.body?.scrollHeight ?? 0,
    );
    setHeight(h + 32);
  }

  useEffect(() => {
    // Re-measure shortly after mount in case fonts shift layout
    const t = window.setTimeout(measure, 800);
    return () => window.clearTimeout(t);
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      title={title}
      onLoad={measure}
      sandbox="allow-same-origin allow-scripts allow-popups"
      className={className ?? "w-full border-0 bg-white"}
      style={{ height }}
    />
  );
});

export default ResourceFrame;
