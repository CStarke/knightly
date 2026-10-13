/** Uses the same bundled map on web; no external website or PDF plugin is needed. */
export default function CampusMapView({ html }: { html: string }) {
  return (
    <iframe
      title="Calvin University campus map"
      srcDoc={html}
      sandbox="allow-scripts"
      style={{ width: '100%', height: '100%', border: 0, flex: 1 }}
    />
  );
}
