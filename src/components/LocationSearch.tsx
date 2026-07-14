import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import type { BirthInput } from '../lib/bazi';
import {
  deriveTimeZoneProfile,
  formatUtcOffset,
  searchBirthplaces,
  type BirthplaceResult,
} from '../lib/location';

export type LocationPatch = Pick<
  BirthInput,
  'locationName' | 'longitude' | 'latitude' | 'utcOffset' | 'dstMinutes' | 'timeBasis'
>;

interface LocationSearchProps {
  input: BirthInput;
  onResolve: (patch: LocationPatch) => void;
  compact?: boolean;
}

const CACHE_PREFIX = 'mingjing:birthplace:';

function readCache(query: string): BirthplaceResult[] | null {
  try {
    const raw = window.sessionStorage.getItem(`${CACHE_PREFIX}${query.toLowerCase()}`);
    return raw ? JSON.parse(raw) as BirthplaceResult[] : null;
  } catch {
    return null;
  }
}

function writeCache(query: string, results: BirthplaceResult[]) {
  try {
    window.sessionStorage.setItem(`${CACHE_PREFIX}${query.toLowerCase()}`, JSON.stringify(results));
  } catch {
    // 浏览器禁用存储时不影响地点搜索。
  }
}

export function LocationSearch({ input, onResolve, compact = false }: LocationSearchProps) {
  const [query, setQuery] = useState(input.locationName);
  const [results, setResults] = useState<BirthplaceResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setQuery(input.locationName);
  }, [input.locationName]);

  const profile = useMemo(() => {
    try {
      return deriveTimeZoneProfile(input);
    } catch {
      return null;
    }
  }, [input]);

  async function runSearch() {
    const trimmed = query.trim();
    setStatus('loading');
    setMessage('');
    try {
      const cached = readCache(trimmed);
      const next = cached ?? await searchBirthplaces(trimmed);
      if (!cached) writeCache(trimmed, next);
      setResults(next);
      setStatus('idle');
      if (!next.length) setMessage('没有找到匹配地点。试试“省/州 + 城市/区县”，例如“山东 济宁 兖州”。');
    } catch (reason) {
      setResults([]);
      setStatus('error');
      setMessage(reason instanceof Error ? reason.message : '地点搜索失败，请稍后重试。');
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void runSearch();
  }

  function choosePlace(place: BirthplaceResult) {
    const nextInput: BirthInput = {
      ...input,
      locationName: place.shortName,
      latitude: place.latitude,
      longitude: place.longitude,
      timeBasis: 'true-solar',
    };
    const nextProfile = deriveTimeZoneProfile(nextInput);
    onResolve({
      locationName: place.shortName,
      latitude: place.latitude,
      longitude: place.longitude,
      utcOffset: nextProfile.utcOffset,
      dstMinutes: nextProfile.dstMinutes,
      timeBasis: 'true-solar',
    });
    setQuery(place.shortName);
    setResults([]);
    setMessage('');
    setStatus('idle');
  }

  return (
    <section className={`location-search ${compact ? 'compact' : ''}`}>
      <label className="field">
        <span>出生地（城市、区县或乡镇）</span>
        <div className="location-query-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：山东济宁兖州 / Baltimore"
            autoComplete="off"
          />
          <button type="button" onClick={() => void runSearch()} disabled={status === 'loading'}>
            {status === 'loading' ? '查找中…' : '查找地点'}
          </button>
        </div>
      </label>

      {message && <p className={status === 'error' ? 'location-message error' : 'location-message'}>{message}</p>}

      {results.length > 0 && (
        <div className="location-results" role="listbox" aria-label="地点搜索结果">
          {results.map((place) => (
            <button type="button" role="option" key={place.id} onClick={() => choosePlace(place)}>
              <b>{place.shortName}</b>
              <span>{place.displayName}</span>
              <small>{place.latitude.toFixed(4)}°, {place.longitude.toFixed(4)}°</small>
            </button>
          ))}
        </div>
      )}

      <div className="location-resolved">
        <div><span>当前采用</span><b>{input.locationName}</b></div>
        <small>
          {profile
            ? `${profile.timeZone} · 当地 ${formatUtcOffset(profile.actualUtcOffset)} · 真太阳时自动校准`
            : '正在识别历史时区与太阳时参数'}
        </small>
      </div>

      {!compact && (
        <details className="location-audit">
          <summary>查看自动识别参数</summary>
          <dl>
            <div><dt>纬度</dt><dd>{input.latitude.toFixed(5)}°</dd></div>
            <div><dt>经度</dt><dd>{input.longitude.toFixed(5)}°</dd></div>
            <div><dt>标准时区</dt><dd>{formatUtcOffset(input.utcOffset)}</dd></div>
            <div><dt>当日夏令时</dt><dd>{input.dstMinutes ? `${input.dstMinutes} 分钟` : '无'}</dd></div>
          </dl>
        </details>
      )}

      <p className="location-attribution">
        地点搜索仅在点击按钮时发起 · 数据 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
      </p>
    </section>
  );
}
