"use client";

import { useRef, useState } from "react";
import { Check, Download, File, FileText, Film, Image as ImageIcon, Trash2, Type, Upload } from "lucide-react";
import { ASSET_KINDS, NOW, client as getClient, user, type Asset, type AssetKind } from "@/lib/data";
import { ago } from "@/lib/format";
import { useStore } from "./store";
import { useSession } from "./session";

const KIND_ICON: Record<AssetKind, typeof File> = { logo: ImageIcon, foto: ImageIcon, video: Film, manual: FileText, fonte: Type, documento: FileText };

export const fileSize = (b: number) =>
  b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;

const guessKind = (f: File): AssetKind =>
  f.type.startsWith("video/") ? "video"
  : /logo/i.test(f.name) ? "logo"
  : f.type.startsWith("image/") ? "foto"
  : /font|\.otf|\.ttf|\.woff/i.test(f.name) ? "fonte"
  : /manual|brand|marca/i.test(f.name) ? "manual"
  : "documento";

/** Images are downscaled so the prototype can keep them in the browser. */
function readImage(f: File): Promise<string | undefined> {
  if (!f.type.startsWith("image/") || f.type === "image/svg+xml") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1080 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => resolve(undefined);
    img.src = url;
  });
}

export function useUpload(clientId: string) {
  const { addAsset } = useStore();
  const { user: me } = useSession();
  return async (files: FileList | null) => {
    const added: Asset[] = [];
    for (const f of Array.from(files ?? [])) {
      const a: Asset = {
        id: `a${Date.now().toString(36)}${Math.round(Math.random() * 1e4)}`,
        clientId, name: f.name, kind: guessKind(f), size: f.size, uploadedBy: me.id, date: new Date(), tags: [],
        src: await readImage(f),
      };
      addAsset(a);
      added.push(a);
    }
    return added;
  };
}

function Thumb({ a }: { a: Asset }) {
  const Icon = KIND_ICON[a.kind];
  const c = getClient(a.clientId);
  if (a.src) return <div className="asset__thumb" style={{ background: `center / cover url("${a.src}")` }} />;
  return (
    <div className="asset__thumb" style={{ background: a.kind === "foto" || a.kind === "logo" ? `linear-gradient(150deg, oklch(0.6 0.08 ${c?.hue ?? 200}), oklch(0.4 0.07 ${(c?.hue ?? 200) + 30}))` : undefined }}>
      <Icon size={26} />
      <span>{a.name.split(".").pop()?.toUpperCase()}</span>
    </div>
  );
}

/** Client file library: brand assets, photos, videos, documents. */
export function AssetLibrary({ clientId }: { clientId: string }) {
  const { assets, removeAsset } = useStore();
  const upload = useUpload(clientId);
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AssetKind | "">("");
  const [over, setOver] = useState(false);
  const mine = assets.filter((a) => a.clientId === clientId);
  const shown = mine.filter((a) => !kind || a.kind === kind);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
    >
      <div className="spread" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <div className="filters" style={{ margin: 0 }}>
          <button className="chip" aria-pressed={!kind} onClick={() => setKind("")}>Tudo <span className="faint">{mine.length}</span></button>
          {(Object.keys(ASSET_KINDS) as AssetKind[]).map((k) => {
            const n = mine.filter((a) => a.kind === k).length;
            return n ? (
              <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {ASSET_KINDS[k]} <span className="faint">{n}</span>
              </button>
            ) : null;
          })}
        </div>
        <button className="btn btn--primary" onClick={() => input.current?.click()}><Upload size={15} /> Carregar ficheiros</button>
        <input ref={input} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </div>
      <div className={`dropzone ${over ? "is-over" : ""}`}>
        <Upload size={16} /> Arrasta ficheiros para aqui — logótipos, fotos, vídeos, manual de marca…
      </div>
      <div className="asset-grid">
        {shown.map((a) => (
          <article key={a.id} className="asset">
            <Thumb a={a} />
            <div className="asset__body">
              <div className="truncate" style={{ fontWeight: 600, fontSize: 13 }} title={a.name}>{a.name}</div>
              <div className="faint" style={{ fontSize: 12 }}>{ASSET_KINDS[a.kind]} · {fileSize(a.size)}</div>
              <div className="faint" style={{ fontSize: 12 }}>{user(a.uploadedBy).name.split(" ")[0]} · {ago(a.date, NOW)}</div>
            </div>
            <div className="asset__actions">
              {a.src && <a className="icon-btn" href={a.src} download={a.name} aria-label="Descarregar"><Download size={15} /></a>}
              <button className="icon-btn" aria-label="Apagar" onClick={() => confirm(`Apagar ${a.name}?`) && removeAsset(a.id)}><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** Choose images from the library for a post (or upload new ones). */
export function AssetPicker({ clientId, value, onChange }: { clientId: string; value: string[]; onChange: (ids: string[]) => void }) {
  const { assets } = useStore();
  const upload = useUpload(clientId);
  const input = useRef<HTMLInputElement>(null);
  const images = assets.filter((a) => a.clientId === clientId && (a.kind === "foto" || a.kind === "logo" || a.kind === "video"));
  return (
    <div>
      <div className="picker">
        {images.slice(0, 11).map((a) => {
          const on = value.includes(a.id);
          return (
            <button key={a.id} type="button" className={`picker__item ${on ? "is-on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== a.id) : [...value, a.id])} title={a.name}>
              <Thumb a={a} />
              {on && <span className="picker__check"><Check size={12} strokeWidth={3} /></span>}
            </button>
          );
        })}
        <button type="button" className="picker__item picker__add" onClick={() => input.current?.click()}>
          <Upload size={18} />
          <span>Carregar</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={async (e) => {
            const added = await upload(e.target.files);
            onChange([...value, ...added.map((a) => a.id)]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>A primeira imagem escolhida aparece na pré-visualização e no portal do cliente.</p>
    </div>
  );
}
