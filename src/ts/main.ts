type ImageAsset = {
  path: string;
  data: Uint8Array;
};

type Md2DocxRuntime = {
  convertMarkdownToDocx: (
    markdown: string,
    options?: {
      inputPath?: string;
      imageLoader?: (path: string) => ImageAsset | undefined;
    }
  ) => {
    docx: Uint8Array;
    summary: unknown;
  };
  formatSummary: (summary: unknown) => string;
};

declare global {
  interface Window {
    __mikuMd2docxRuntime?: Md2DocxRuntime;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const runtime = window.__mikuMd2docxRuntime;
  if (!runtime) {
    throw new Error("miku-md2docx runtime is not loaded");
  }

  const markdownFileSelect = getElement("markdownFileSelect");
  const imageAssetInput = getInputElement("imageAssetInput");
  const convertBtn = getButton("convertBtn");
  const downloadBtn = getButton("downloadBtn");
  const clearBtn = getButton("clearBtn");

  let selectedMarkdownFile: File | null = null;
  let lastDocx: Uint8Array | null = null;
  let lastOutputName = "document.docx";

  setStatus("Select a Markdown file to convert.");
  updateActionState();

  markdownFileSelect.addEventListener("lht-file-select:change", (event) => {
    const customEvent = event as CustomEvent<{ files?: File[] }>;
    selectedMarkdownFile = customEvent.detail.files?.[0] || null;
    lastDocx = null;
    clearError();
    clearSummary();
    updateActionState();
    setStatus(selectedMarkdownFile ? `Selected ${selectedMarkdownFile.name}.` : "Select a Markdown file to convert.");
  });

  imageAssetInput.addEventListener("change", () => {
    if (selectedMarkdownFile) {
      setStatus(`Selected ${selectedMarkdownFile.name}.`);
    }
  });

  convertBtn.addEventListener("click", () => {
    void convertSelectedMarkdown();
  });

  downloadBtn.addEventListener("click", () => {
    if (!lastDocx) return;
    const blob = new Blob([toArrayBuffer(lastDocx)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    triggerBlobDownload(lastOutputName, blob);
    setStatus(`Downloaded ${lastOutputName}`);
    showToast("DOCX saved");
  });

  clearBtn.addEventListener("click", () => {
    selectedMarkdownFile = null;
    lastDocx = null;
    lastOutputName = "document.docx";
    imageAssetInput.value = "";
    clearSummary();
    clearError();
    updateActionState();
    setStatus("Select a Markdown file to convert.");
  });

  async function convertSelectedMarkdown(): Promise<void> {
    if (!selectedMarkdownFile) {
      setStatus("Select a Markdown file first.");
      return;
    }

    clearError();
    setLoading(true);
    setStatus(`Loading ${selectedMarkdownFile.name} ...`);
    try {
      const markdown = await selectedMarkdownFile.text();
      const imageAssets = await loadImageAssets(imageAssetInput.files);
      const result = runtime.convertMarkdownToDocx(markdown, {
        inputPath: selectedMarkdownFile.name,
        imageLoader: (imagePath) => imageAssets.get(imagePath) ?? imageAssets.get(basename(imagePath))
      });
      lastDocx = result.docx;
      lastOutputName = outputName(selectedMarkdownFile.name);
      setSummaryText(runtime.formatSummary(result.summary));
      updateActionState();
      setStatus(`Converted ${selectedMarkdownFile.name}`);
      showToast("Converted to DOCX");
    } catch (error) {
      handleConversionError(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadImageAssets(files: FileList | null): Promise<Map<string, ImageAsset>> {
    const assets = new Map<string, ImageAsset>();
    if (!files) return assets;

    for (const file of Array.from(files)) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const imagePath = file.webkitRelativePath || file.name;
      assets.set(imagePath, { path: imagePath, data: bytes });
      assets.set(file.name, { path: file.name, data: bytes });
    }
    return assets;
  }

  function updateActionState(): void {
    convertBtn.disabled = !selectedMarkdownFile;
    downloadBtn.disabled = !lastDocx;
  }

  function handleConversionError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    showError(message);
    setStatus(`Failed: ${message}`);
    lastDocx = null;
    updateActionState();
  }
});

function outputName(inputName: string): string {
  return inputName.replace(/\.[^.]+$/, "") + ".docx";
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function triggerBlobDownload(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element not found: ${id}`);
  }
  return element;
}

function getInputElement(id: string): HTMLInputElement {
  return getElement(id) as HTMLInputElement;
}

function getButton(id: string): HTMLButtonElement {
  return getElement(id) as HTMLButtonElement;
}

function getPreview(id: string): {
  setText: (text: string) => void;
  clear: () => void;
  getText: () => string;
} {
  return getElement(id) as unknown as {
    setText: (text: string) => void;
    clear: () => void;
    getText: () => string;
  };
}

function setStatus(message: string): void {
  getElement("statusText").textContent = message;
}

function setSummaryText(message: string): void {
  getPreview("summaryPreview").setText(message);
}

function clearSummary(): void {
  getPreview("summaryPreview").clear();
}

function setLoading(active: boolean): void {
  const overlay = getElement("loadingOverlay") as HTMLElement & { setActive?: (active: boolean) => void };
  if (typeof overlay.setActive === "function") {
    overlay.setActive(active);
  }
}

function clearError(): void {
  const errorAlert = getElement("errorAlert") as HTMLElement & { clear?: () => void };
  if (typeof errorAlert.clear === "function") {
    errorAlert.clear();
  }
}

function showError(message: string): void {
  const errorAlert = getElement("errorAlert") as HTMLElement & { show?: (message: string) => void };
  if (typeof errorAlert.show === "function") {
    errorAlert.show(message);
  }
}

function showToast(message: string): void {
  const toast = getElement("toast") as HTMLElement & { show?: (message: string) => void };
  if (typeof toast.show === "function") {
    toast.show(message);
    return;
  }
  setStatus(message);
}
