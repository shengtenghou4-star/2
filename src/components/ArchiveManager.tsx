import { useEffect, useMemo, useState } from 'react';
import type { BirthInput } from '../lib/bazi-audited';

const STORAGE_KEY = 'mingjing.chart-archive.v1';

interface SavedChart {
  id: string;
  name: string;
  tags: string[];
  note: string;
  input: BirthInput;
  createdAt: string;
  updatedAt: string;
}

function readArchive(): SavedChart[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const value = JSON.parse(raw) as SavedChart[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArchive(items: SavedChart[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function ArchiveManager({ currentInput, onLoad }: { currentInput: BirthInput; onLoad: (input: BirthInput) => void }) {
  const [items, setItems] = useState<SavedChart[]>(() => readArchive());
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => writeArchive(items), [items]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => [item.name, item.note, ...item.tags, item.input.locationName].join(' ').toLowerCase().includes(keyword));
  }, [items, query]);

  function save() {
    const trimmed = name.trim() || `${currentInput.year}-${currentInput.month}-${currentInput.day}`;
    const now = new Date().toISOString();
    const next: SavedChart = {
      id: `chart-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: trimmed,
      tags: tags.split(/[,，\s]+/).map((item) => item.trim()).filter(Boolean),
      note: note.trim(),
      input: { ...currentInput },
      createdAt: now,
      updatedAt: now,
    };
    setItems((previous) => [next, ...previous]);
    setName('');
    setTags('');
    setNote('');
    setMessage('已保存在此浏览器本地。');
  }

  function remove(id: string) {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }

  async function exportArchive() {
    await navigator.clipboard.writeText(JSON.stringify(items, null, 2));
    setMessage('已复制全部档案 JSON。');
  }

  function clearAll() {
    setItems([]);
    setMessage('本地档案已清空。');
  }

  return (
    <section className="archive-manager">
      <div className="archive-heading"><div><span>LOCAL ARCHIVE</span><h3>命盘档案</h3></div><b>{items.length}</b></div>
      <p>只保存在当前浏览器，不上传服务器。可保存自己、家人、朋友或候选时辰。</p>
      <div className="archive-save-grid">
        <input placeholder="档案名称" value={name} onChange={(event) => setName(event.target.value)} />
        <input placeholder="标签，用空格分隔" value={tags} onChange={(event) => setTags(event.target.value)} />
        <input placeholder="备注" value={note} onChange={(event) => setNote(event.target.value)} />
        <button type="button" onClick={save}>保存当前输入</button>
      </div>
      <input className="archive-search" placeholder="搜索名称、标签、地点或备注" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="archive-list">
        {filtered.length ? filtered.map((item) => (
          <article key={item.id}>
            <header><div><b>{item.name}</b><span>{item.tags.join(' · ') || '未加标签'}</span></div><em>{item.input.year}-{String(item.input.month).padStart(2, '0')}-{String(item.input.day).padStart(2, '0')} {String(item.input.hour).padStart(2, '0')}:{String(item.input.minute).padStart(2, '0')}</em></header>
            <p>{item.note || `${item.input.locationName} · ${item.input.timeBasis === 'true-solar' ? '真太阳时' : '民用时'}`}</p>
            <div><button type="button" onClick={() => onLoad(item.input)}>载入</button><button type="button" onClick={() => remove(item.id)}>删除</button></div>
          </article>
        )) : <p className="archive-empty">暂无匹配档案。</p>}
      </div>
      <div className="archive-actions"><button type="button" onClick={exportArchive}>复制全部 JSON</button><button type="button" onClick={clearAll}>清空本地档案</button></div>
      {message && <small>{message}</small>}
    </section>
  );
}
