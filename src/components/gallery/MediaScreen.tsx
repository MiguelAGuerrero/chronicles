import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { captureEdits } from '../../lib/captureEdits';
import { useHidden, useOnDeleted } from '../../lib/deletion/useDeletions';
import { gallery } from '../../lib/gallery';
import { capFirst, emptyLine } from '../../lib/gallery/copy';
import { blockRows, coverHeight, dayRows, galleryBlocks, galleryDays, galleryTiles, tileLabel, tilePlace, type Block, type Row, type Tile } from '../../lib/gallery/layout';
import type { Zoom } from '../../lib/gallery/types';
import { anchorAfter, fitFor, zoomed } from '../../lib/gallery/view';
import { pieceKey, type Faced } from '../../lib/moment';
import { resurface } from '../../lib/resurface';
import { chronicleSection } from '../../lib/resurface/sectionStore';
import { useStore } from '../../lib/useStore';
import { CaptureViewer } from '../CaptureView';
import { UndoToast } from '../UndoToast';
import { theme } from '../ui';
import { GalleryBar } from './GalleryBar';
import { GalleryTile } from './GalleryTile';
import { PeriodBlock } from './PeriodBlock';
import { usePinch } from './usePinch';
import { ViewMenu } from './ViewMenu';

/** On the web a pinch on the grid is the grid's, never the browser's page zoom (MG20); one finger still scrolls. */
const PAN_ONLY = (Platform.OS === 'web' ? { touchAction: 'pan-y' } : {}) as object;

const timeOf = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * Chronicle's Media (specs/media-gallery, MG1-MG22): every photo, video and memo piece in an edge-to-edge grid under
 * a pinned header for each day, or as months and years; a View menu for Sort, Show, Size and Grid, and pinch. A tile
 * opens its moment whole in the viewer. Reads through the `gallery` shell; never the db.
 */
export function MediaScreen() {
  const st = useStore(gallery.store, (s) => s);
  const hidden = useHidden();
  const { width: windowW } = useWindowDimensions();
  const [width, setWidth] = useState(windowW);
  const [now, setNow] = useState(() => Date.now());
  const [menu, setMenu] = useState(false);
  const [viewing, setViewing] = useState<{ list: Faced[]; startAt: { id: string; piece: string } } | null>(null);
  const list = useRef<FlatList<Row>>(null);
  const offset = useRef(0);
  // A scroll asked for on the same list (the size or the sort changed): applied once its rows are drawn (MG18, MG20).
  const pending = useRef<number | null>(null);
  // Where a new level opens (MG19): a month to its first day, a year to its first month. The list is remounted for
  // each level, so this is its initial row.
  const [landing, setLanding] = useState<{ kind: 'day' | 'month'; key: string } | null>(null);

  // A new open of Chronicle is All Items and Days again (MG9, MG19); every show reads what is new (MG14).
  useFocusEffect(
    useCallback(() => {
      gallery.opened(chronicleSection.visit());
      void gallery.loadView();
      void gallery.load().then(() => setNow(Date.now()));
    }, []),
  );
  // A delete stored reads again (D9); one waiting in Undo is already out, through `hidden` (MG13).
  useOnDeleted(() => {
    void gallery.load();
  });

  const moments = useMemo(() => {
    if (!hidden.size) return st.moments;
    const out: Faced[] = [];
    for (const m of st.moments) {
      if (hidden.has(m.id)) continue;
      const pieces = m.pieces.filter((p) => !hidden.has(pieceKey(p.id)));
      if (!pieces.length) continue;
      out.push(pieces.length === m.pieces.length ? m : { ...m, pieces });
    }
    return out;
  }, [st.moments, hidden]);
  const walks = useMemo(() => new Map(st.walks.map((w) => [w.id, w])), [st.walks]);
  const tiles = useMemo(() => galleryTiles(moments, st.walks, st.show, st.view.order), [moments, st.walks, st.show, st.view.order]);
  const rows = useMemo<Row[]>(() => {
    if (st.zoom === 'days') return dayRows(galleryDays(tiles, walks, st.streets, now), width, st.view.size).rows;
    return blockRows(galleryBlocks(tiles, walks, st.streets, st.zoom === 'months' ? 'month' : 'year', now), width);
  }, [tiles, walks, st.streets, now, width, st.view.size, st.zoom]);
  const cell = useMemo(() => {
    const r = rows.find((x) => x.kind === 'tiles');
    return r ? r.height - 1 : 0;
  }, [rows]);
  const sticky = useMemo(() => (st.zoom === 'days' ? rows.flatMap((r, i) => (r.kind === 'header' ? [i] : [])) : []), [rows, st.zoom]);
  const fit = fitFor(st.view.shape);
  const firstRow = useMemo(() => {
    if (!landing) return -1;
    return rows.findIndex((r) => (landing.kind === 'day' ? r.kind === 'header' && r.day.key === landing.key : r.kind === 'block' && r.block.key === landing.key));
  }, [rows, landing]);

  // A scroll asked for in a handler (a month opened, the size changed) lands once its rows are drawn (MG19, MG20).
  useEffect(() => {
    const to = pending.current;
    if (to == null) return;
    pending.current = null;
    requestAnimationFrame(() => list.current?.scrollToOffset({ offset: to, animated: false }));
  }, [rows]);

  const setZoom = (z: Zoom) => {
    if (z === st.zoom) return;
    setLanding(null);
    gallery.setZoom(z);
  };
  const resize = (dir: 'in' | 'out') => {
    const next = zoomed(st.view.size, dir);
    if (next == null || st.zoom !== 'days') return;
    const after = dayRows(galleryDays(tiles, walks, st.streets, now), width, next).rows;
    pending.current = anchorAfter(rows, offset.current, after);
    void gallery.setView({ size: next });
  };
  const pinch = usePinch(resize, st.zoom === 'days');

  const openTile = useCallback(
    (tile: Tile) => {
      // The moments in the gallery's order and under its filter (MG8); each opens whole.
      const order: string[] = [];
      const seenIds = new Set<string>();
      for (const t of tiles) {
        if (seenIds.has(t.momentId)) continue;
        seenIds.add(t.momentId);
        order.push(t.momentId);
      }
      const byId = new Map(moments.map((m) => [m.id, m]));
      setViewing({ list: order.map((id) => byId.get(id)).filter((m): m is Faced => !!m), startAt: { id: tile.momentId, piece: tile.key } });
    },
    [tiles, moments],
  );
  const openBlock = useCallback(
    (b: Block) => {
      setLanding(st.zoom === 'months' ? { kind: 'day', key: b.firstDay } : { kind: 'month', key: b.firstMonth });
      gallery.setZoom(st.zoom === 'months' ? 'days' : 'months');
    },
    [st.zoom],
  );
  const wantsThumb = useCallback((id: string) => void gallery.thumbFor(id), []);

  // The viewer's place and walk line, as Memories' cards say it (MG8), read for the moment shown.
  const context = useStore(resurface.store, (s) => s.context);
  const viewerContext = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of viewing?.list ?? []) {
      const c = context[f.id];
      m.set(f.id, c?.state === 'done' ? c.line : capFirst(tilePlace({ walkId: f.walk_id, momentId: f.id }, walks, st.streets)));
    }
    return m;
  }, [viewing, context, walks, st.streets]);
  const onShown = useCallback(
    (id: string) => {
      void (async () => {
        if (!resurface.store.get().moments.some((m) => m.id === id)) await resurface.refresh();
        await resurface.contextFor([id], hidden);
      })();
    },
    [hidden],
  );

  // The streets of loose moments on screen (MG6), read as their days come into view.
  const looseOf = useRef<(rows: Row[]) => void>(() => {});
  useEffect(() => {
    looseOf.current = (shown: Row[]) => {
      const ids = new Set<string>();
      for (const r of shown) {
        const ts = r.kind === 'header' ? r.day.tiles : r.kind === 'tiles' ? r.tiles : r.kind === 'block' ? [r.block.cover] : [];
        for (const t of ts) if (!t.walkId || !walks.has(t.walkId)) ids.add(t.momentId);
      }
      if (ids.size) void gallery.streetsFor([...ids]);
    };
  });
  // FlatList wants one callback for its life: kept in state, it reads the latest rows through the ref when called.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: { item: Row }[] }) => looseOf.current(viewableItems.map((v) => v.item)));
  useEffect(() => {
    if (st.zoom === 'days') looseOf.current(rows.slice(0, 20));
  }, [rows, st.zoom]);

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'header')
        return (
          <View style={[styles.header, { height: item.height }]} testID="gallery-day" {...({ dataSet: { day: item.day.key } } as object)}>
            <Text testID="gallery-day-title" style={styles.title} accessibilityRole="header" numberOfLines={1}>{item.day.title}</Text>
            <Text testID="gallery-day-line" style={styles.line} numberOfLines={2}>{item.day.line}</Text>
          </View>
        );
      if (item.kind === 'tiles')
        return (
          <View style={[styles.row, { height: item.height }]}>
            {item.tiles.map((t) => (
              <GalleryTile key={t.key} tile={t} size={cell} fit={fit} label={tileLabel(t, timeOf(t.t), walks, st.streets)} onPress={openTile} onWantsThumb={wantsThumb} />
            ))}
          </View>
        );
      return <PeriodBlock block={item.block} width={width} coverH={coverHeight(width)} fit={fit} onPress={openBlock} />;
    },
    [cell, fit, walks, st.streets, openTile, wantsThumb, width, openBlock],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w && w !== width) setWidth(w);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  };

  const empty = st.status === 'ready' && !tiles.length;
  return (
    <View style={styles.screen} testID="media-screen">
      <GalleryBar zoom={st.zoom} show={st.show} onZoom={setZoom} onMenu={() => setMenu(true)} onShowAll={() => gallery.setShow('all')} />
      <View style={[styles.body, PAN_ONLY]} onLayout={onLayout} {...pinch}>
        {empty ? (
          <View style={styles.quiet}>
            <Text testID="gallery-empty" style={styles.quietText}>{emptyLine(st.show)}</Text>
          </View>
        ) : (
          <FlatList
            ref={list}
            key={st.zoom}
            data={rows}
            keyExtractor={(r) => r.key}
            renderItem={renderRow}
            getItemLayout={(_, index) => ({ length: rows[index]?.height ?? 0, offset: rows[index]?.offset ?? 0, index })}
            initialScrollIndex={firstRow > 0 ? firstRow : undefined}
            stickyHeaderIndices={sticky}
            initialNumToRender={14}
            maxToRenderPerBatch={12}
            windowSize={7}
            onScroll={onScroll}
            scrollEventThrottle={32}
            onViewableItemsChanged={onViewable}
            accessibilityRole="list"
            testID="gallery-list"
          />
        )}
      </View>
      <ViewMenu
        open={menu}
        view={st.view}
        show={st.show}
        sizable={st.zoom === 'days'}
        onClose={() => setMenu(false)}
        onOrder={(order) => {
          pending.current = 0;
          void gallery.setView({ order });
        }}
        onShow={(s) => {
          pending.current = 0;
          gallery.setShow(s);
        }}
        onZoom={resize}
        onShape={(shape) => void gallery.setView({ shape })}
      />
      <CaptureViewer
        key={viewing ? `gallery:${viewing.startAt.piece}` : 'gallery:none'}
        captures={viewing?.list ?? null}
        startAt={viewing?.startAt ?? null}
        position={false}
        context={viewerContext}
        onShown={onShown}
        onClose={() => {
          setViewing(null);
          void gallery.load();
        }}
        remind
        onSaveEdit={async (c, patch) => {
          await captureEdits.save(c, patch);
          gallery.patch(c.piece_id, patch);
          resurface.patch(c.id, patch);
        }}
        onSaveNote={(c, body) => resurface.saveNote(c, body)}
      />
      <UndoToast style={{ bottom: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { flex: 1 },
  header: { backgroundColor: theme.bg, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, justifyContent: 'flex-end' },
  title: { color: theme.ink, fontSize: 17, fontWeight: '700' },
  line: { color: theme.muted, fontSize: 13, lineHeight: 17 },
  row: { flexDirection: 'row', gap: 1 },
  quiet: { padding: 24 },
  quietText: { color: theme.ink, fontSize: 16, lineHeight: 23 },
});
