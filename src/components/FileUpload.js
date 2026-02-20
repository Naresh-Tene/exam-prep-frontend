import { useState, useEffect, useRef } from "react";
import API from "../services/api";

const ACCEPT = ".pdf,image/jpeg,image/png,image/gif,image/webp";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function FilePreview({ filename }) {
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

  if (loading) return <span className="upload-preview-loading">Loading…</span>;
  if (!url && isImage) return <span className="upload-preview-name">{filename}</span>;

  if (isImage) {
    return (
      <div className="upload-preview-wrap">
        <img src={url} alt={filename} className="upload-preview-img" />
        <span className="upload-preview-name">{filename}</span>
      </div>
    );
  }
  if (isPdf && url) {
    return (
      <div className="upload-preview-wrap">
        <a href={url} target="_blank" rel="noopener noreferrer" className="upload-preview-pdf">
          View PDF
        </a>
        <span className="upload-preview-name">{filename}</span>
      </div>
    );
  }
  return <span className="upload-preview-name">{filename}</span>;
}

function FileUpload() {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const fetchUploads = async () => {
    try {
      const { data } = await API.get("/upload/uploads");
      setFiles(data.files || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load uploads");
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const uploadFiles = async (fileList) => {
    if (!fileList?.length) return;
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append("files", fileList[i]);
    }
    setUploading(true);
    setError("");
    try {
      await API.post("/upload", formData);
      await fetchUploads();
    } catch (err) {
      const data = err.response?.data;
      const msg =
        (data && (data.message || data.error)) ||
        (err.response?.status === 401 && "Please log in again") ||
        (err.response?.status === 413 && "File too large (max 10MB)") ||
        err.message ||
        "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const items = e.dataTransfer.files;
    if (items?.length) uploadFiles(Array.from(items));
  };

  const handleSelect = (e) => {
    const items = e.target.files;
    if (items?.length) uploadFiles(Array.from(items));
    e.target.value = "";
  };

  return (
    <div className="file-upload">
      <h3>Upload files</h3>
      <div
        className={`drop-zone ${dragging ? "drop-zone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleSelect}
          style={{ display: "none" }}
        />
        {uploading ? (
          <span>Uploading…</span>
        ) : (
          <span>Drop PDF or images here, or click to select</span>
        )}
      </div>
      {error && <p className="upload-error">{error}</p>}
      <h4>Uploaded files</h4>
      {files.length === 0 ? (
        <p className="upload-list-empty">No files yet.</p>
      ) : (
        <ul className="upload-list">
          {files.map((name) => (
            <li key={name}>
              <FilePreview filename={name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FileUpload;
