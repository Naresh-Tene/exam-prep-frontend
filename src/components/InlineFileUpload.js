import { useState, useEffect, useRef } from "react";
import API from "../services/api";

const ACCEPT = ".pdf,image/jpeg,image/png,image/gif,image/webp";
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function FilePreview({ filename, onDelete }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const urlRef = useRef(null);

  const loadFile = () => {
    API.get("/upload/file/" + encodeURIComponent(filename), { responseType: "blob" })
      .then((res) => {
        const objectUrl = URL.createObjectURL(res.data);
        urlRef.current = objectUrl;
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFile();
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [filename]);

  const handleDelete = async () => {
    if (window.confirm("Delete this file?")) {
      try {
        await API.delete("/upload/file/" + encodeURIComponent(filename));
        onDelete(filename);
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
        }
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete file");
      }
    }
  };

  const isImage = IMAGE_EXT.test(filename);
  const isPdf = /\.pdf$/i.test(filename);

  if (loading) {
    return (
      <div className="inline-file-item">
        <span className="upload-preview-loading">Loading…</span>
        <button type="button" onClick={handleDelete} className="file-delete-btn">
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="inline-file-item">
      {isImage && url && (
        <img src={url} alt={filename} className="inline-file-preview" />
      )}
      {isPdf && url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-file-link">
          📄 {filename}
        </a>
      )}
      {!url && <span className="inline-file-name">{filename}</span>}
      <button type="button" onClick={handleDelete} className="file-delete-btn">
        Delete
      </button>
    </div>
  );
}

function InlineFileUpload({ files, onFilesChange }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const uploadFiles = async (fileList) => {
    if (!fileList?.length) return;
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append("files", fileList[i]);
    }
    setUploading(true);
    try {
      const { data } = await API.post("/upload", formData);
      onFilesChange([...files, ...(data.files || [])]);
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
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

  const handleDelete = (filename) => {
    onFilesChange(files.filter((f) => f !== filename));
  };

  return (
    <div className="inline-file-upload">
      <label>
        Upload files <span className="optional-label">(Optional)</span>
      </label>
      <div
        className={`inline-drop-zone ${dragging ? "inline-drop-zone--active" : ""}`}
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
      {files.length > 0 && (
        <div className="inline-files-list">
          {files.map((filename) => (
            <FilePreview key={filename} filename={filename} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default InlineFileUpload;
