import { useState, useEffect, useRef } from "react";
import API from "../services/api";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function ArticleFileDisplay({ files }) {
  if (!files || files.length === 0) return null;

  return (
    <div className="article-files">
      <strong>Files:</strong>
      <div className="article-files-list">
        {files.map((filename) => (
          <ArticleFileItem key={filename} filename={filename} />
        ))}
      </div>
    </div>
  );
}

function ArticleFileItem({ filename }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const urlRef = useRef(null);

  useEffect(() => {
    API.get("/upload/file/" + encodeURIComponent(filename), { responseType: "blob" })
      .then((res) => {
        const objectUrl = URL.createObjectURL(res.data);
        urlRef.current = objectUrl;
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null))
      .finally(() => setLoading(false));

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [filename]);

  const isImage = IMAGE_EXT.test(filename);
  const isPdf = /\.pdf$/i.test(filename);

  if (loading) return <span className="article-file-loading">Loading {filename}…</span>;

  return (
    <div className="article-file-item">
      {isImage && url && (
        <img src={url} alt={filename} className="article-file-img" />
      )}
      {isPdf && url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="article-file-link">
          📄 {filename}
        </a>
      )}
      {!url && <span className="article-file-name">{filename}</span>}
    </div>
  );
}

export default ArticleFileDisplay;
