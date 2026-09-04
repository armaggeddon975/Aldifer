import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { search, type SearchIndex, type SearchResult } from '@/lib/search';

/**
 * Busca rápida da home.
 *
 * MELHORIA PROGRESSIVA DE VERDADE: o que o servidor entrega é um <form> que
 * faz GET para /produtos. Sem JS, digitar e apertar Enter leva ao catálogo
 * filtrado e a busca funciona. A hidratação apenas acrescenta a lista de
 * sugestões — se o JS falhar, ou se a ilha for removida numa otimização de
 * performance, a funcionalidade permanece.
 *
 * O índice (~40 KB) é baixado SÓ no primeiro foco ou na primeira tecla. Quem
 * passa pela home sem usar a busca não paga por ele.
 */

const INDEX_URL = '/indice-de-busca.json';
const MAX_RESULTS = 8;

type Status = 'ocioso' | 'carregando' | 'pronto' | 'falhou';

export default function QuickSearch() {
  const listboxId = useId();
  const inputId = useId();
  const hintId = useId();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<Status>('ocioso');

  const index = useRef<SearchIndex | null>(null);
  const loading = useRef(false);

  const loadIndex = useCallback(async () => {
    if (index.current || loading.current) return;
    loading.current = true;
    setStatus('carregando');
    try {
      const response = await fetch(INDEX_URL);
      if (!response.ok) throw new Error(String(response.status));
      index.current = (await response.json()) as SearchIndex;
      setStatus('pronto');
    } catch {
      // Falhar aqui não pode derrubar a busca: o form continua submetendo
      // para /produtos, que é o caminho sem JS.
      setStatus('falhou');
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    if (!index.current) {
      setResults([]);
      return;
    }
    setResults(search(index.current, query, MAX_RESULTS));
    setActive(-1);
  }, [query, status]);

  const open = results.length > 0;

  function go(result: SearchResult) {
    window.location.href = result.href;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setResults([]);
      setActive(-1);
      return;
    }
    if (!open) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => {
        const next = current + step;
        if (next < 0) return results.length - 1;
        if (next >= results.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === 'Enter' && active >= 0) {
      const chosen = results[active];
      if (chosen) {
        // Só intercepta o Enter quando há sugestão escolhida. Sem escolha,
        // o form submete normalmente para /produtos.
        event.preventDefault();
        go(chosen);
      }
    }
  }

  return (
    <form action="/produtos" method="get" className="quick-search" role="search">
      <label htmlFor={inputId} className="quick-search__label">
        Busque pela medida que você precisa
      </label>

      <div className="quick-search__row">
        <div className="quick-search__field">
          <input
            id={inputId}
            name="q"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="chapa 1/8, tubo 30x30, cantoneira 25"
            aria-describedby={hintId}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listboxId}-${active}` : undefined}
            value={query}
            onFocus={loadIndex}
            onChange={(event) => {
              setQuery(event.target.value);
              void loadIndex();
            }}
            onKeyDown={onKeyDown}
          />

          {open && (
            <ul className="quick-search__results" id={listboxId} role="listbox">
              {results.map((result, position) => (
                <li
                  key={`${result.href}-${result.detalhe ?? ''}`}
                  id={`${listboxId}-${position}`}
                  role="option"
                  aria-selected={position === active}
                  className="quick-search__result"
                  data-active={position === active ? '' : undefined}
                  onMouseEnter={() => setActive(position)}
                  onMouseDown={(event) => {
                    // mousedown, e não click: o blur do input fecharia a lista
                    // antes de o click chegar.
                    event.preventDefault();
                    go(result);
                  }}
                >
                  <span className="quick-search__result-title">{result.titulo}</span>
                  {result.detalhe && (
                    <span className="quick-search__result-detail">{result.detalhe}</span>
                  )}
                  <span className="quick-search__result-category">{result.categoria}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className="quick-search__submit">
          Buscar
        </button>
      </div>

      <p id={hintId} className="quick-search__hint">
        Aceita polegada e milímetro. Sem resultado na lista, o botão leva ao catálogo completo.
      </p>

      {/* Contagem anunciada ao leitor de tela sem roubar o foco do campo. */}
      <p className="sr-only" role="status" aria-live="polite">
        {status === 'falhou'
          ? 'A lista de sugestões não carregou. Use o botão Buscar.'
          : open
            ? `${results.length} ${results.length === 1 ? 'sugestão' : 'sugestões'}`
            : ''}
      </p>
    </form>
  );
}
