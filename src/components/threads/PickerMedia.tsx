import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useHidden } from '../../lib/deletion/useDeletions';
import { gallery } from '../../lib/gallery';
import { ONLY, SHOW_LABEL } from '../../lib/gallery/copy';
import { blockTextHeight, coverHeight, tileLabel, type Block, type Row, type Tile } from '../../lib/gallery/layout';
import type { GalleryView, Show, Zoom } from '../../lib/gallery/types';
import { anchorAfter, fitFor, zoomed } from '../../lib/gallery/view';
import { fromLine } from '../../lib/resurface/views';
import { markedKeys, markStillOffered, pickBar, PICKER_ACTION, PICKER_TABS, pickerEmpty, pickerRows, pickerTiles } from '../../lib/threads/pickerMedia';
import { useStore } from '../../lib/useStore';
import { DayHeader } from '../gallery/DayHeader';
import { GalleryBar } from '../gallery/GalleryBar';
import { GalleryTile } from '../gallery/GalleryTile';
import { PeriodBlock } from '../gallery/PeriodBlock';
import { usePinch } from '../gallery/usePinch';
import { ViewMenu } from '../gallery/ViewMenu';
import { theme } from '../ui';
import type { MomentView } from '../../lib/resurface/types';
import type { MomentPool } from './useMomentPool';

/** On the web a pinch on the grid is the grid's, never the browser's page zoom (MG20); one finger still scrolls. */
const PAN_ONLY = (Platform.OS === 'web' ? { touchAction: 'pan-y' } : {}) as object;
const timeOf = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
/** The bar's room is kept whether or not a moment is marked, so the grid does not move when a mark is made (MP9). */
const BAR_H = 92;
const KINDS: { show: Show; label: string }[] = [
  { show: 'all', label: 'All' },
  { show: 'photo', label: SHOW_LABEL.photo },
  { show: 'video', label: SHOW_LABEL.video },
  { show: 'voice', label: SHOW_LABEL.voice },
];

/**
 * The picker's switch (MP1): List and Media, two nouns in words, directly under the picker's title; a segmented
 * control of tabs, the chosen one selected.
 */
export function PickerTabs(props: { tab: 'list' | 'media'; onTab: (t: 'list' | 'media') => void }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist" testID="picker-tabs">
      {(['list', 'media'] as const).map((t) => {
        const on = props.tab === t;
        return (
          <Pressable
            key={t}
            testID={`picker-tab-${t}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            onPress={() => props.onTab(t)}
            style={[styles.tab, on && styles.tabOn]}
          >
            <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{PICKER_TABS[t]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Media inside a moment picker (specs/picker-media, MP1-MP19): Chronicle's grid of photos, videos and memos (bare tiles
 * under day headers, Years, Months, Days, the View menu, pinch) to choose a moment by what it looks like. A tap marks the
 * moment; the bar under the grid says it and has the one action (Connect or Mention). Its view (sort, size, shape, kind)
 * is its own and is gone with it (MP15): it reads Media's saved view and never writes it.
 */
export function PickerMedia(props: { pool: MomentPool; self: string | null; action: keyof typeof PICKER_ACTION; marked: string | null; onMark: (momentId: string) => void; onPick: (v: MomentView) => void }) {
  const hidden = useHidden();
  const saved = useStore(gallery.store, (s) => s.view);
  const streets = useStore(gallery.store, (s) => s.streets);
  const { width: windowW, fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(Math.min(windowW, 520));
  const [now] = useState(() => Date.now());
  const [zoom, setZoomState] = useState<Zoom>('days');
  const [show, setShow] = useState<Show>('all');
  const [local, setLocal] = useState<Partial<GalleryView>>({});
  const [menu, setMenu] = useState(false);
  const [landing, setLanding] = useState<{ kind: 'day' | 'month'; key: string } | null>(null);
  const view: GalleryView = { ...saved, ...local };
  const list = useRef<FlatList<Row>>(null);
  const offset = useRef(0);
  const pending = useRef<number | null>(null);
  // The grid is laid out once Media's saved view is read, so it never lays out at the default and then jumps (audit 5).
  const [viewReady, setViewReady] = useState(false);

  // Media's saved view is where this starts (MP15); `load` reads the rows the streets of loose moments are read from (MG6).
  useEffect(() => {
    void gallery.loadView().finally(() => setViewReady(true));
    void gallery.load();
  }, []);

  const tiles = useMemo(() => pickerTiles(props.pool.moments, props.pool.walkList, { hidden, self: props.self ?? '', show, order: view.order }), [props.pool.moments, props.pool.walkList, hidden, props.self, show, view.order]);
  const rows = useMemo(() => pickerRows(tiles, props.pool.walkList, streets, now, { zoom, width, size: view.size, fontScale }), [tiles, props.pool.walkList, streets, now, zoom, width, view.size, fontScale]);
  const cell = useMemo(() => {
    const r = rows.find((x) => x.kind === 'tiles');
    return r ? r.height - 1 : 0;
  }, [rows]);
  const sticky = useMemo(() => (zoom === 'days' ? rows.flatMap((r, i) => (r.kind === 'header' ? [i] : [])) : []), [rows, zoom]);
  const keys = useMemo(() => markedKeys(tiles, props.marked), [tiles, props.marked]);
  const fit = fitFor(view.shape);
  const firstRow = useMemo(() => {
    if (!landing) return -1;
    return rows.findIndex((r) => (landing.kind === 'day' ? r.kind === 'header' && r.day.key === landing.key : r.kind === 'block' && r.block.key === landing.key));
  }, [rows, landing]);

  useEffect(() => {
    const to = pending.current;
    if (to == null) return;
    pending.current = null;
    requestAnimationFrame(() => list.current?.scrollToOffset({ offset: to, animated: false }));
  }, [rows]);

  const setZoom = (z: Zoom) => {
    if (z === zoom) return;
    setLanding(null);
    setZoomState(z);
  };
  const resize = (dir: 'in' | 'out') => {
    const next = zoomed(view.size, dir);
    if (next == null || zoom !== 'days') return;
    const after = pickerRows(tiles, props.pool.walkList, streets, now, { zoom, width, size: next, fontScale });
    pending.current = anchorAfter(rows, offset.current, after);
    setLocal((l) => ({ ...l, size: next }));
  };
  const pinch = usePinch(resize, zoom === 'days');
  const openBlock = useCallback(
    (b: Block) => {
      setLanding(zoom === 'months' ? { kind: 'day', key: b.firstDay } : { kind: 'month', key: b.firstMonth });
      setZoomState(zoom === 'months' ? 'days' : 'months');
    },
    [zoom],
  );
  const { onMark } = props;
  const mark = useCallback((t: Tile) => onMark(t.momentId), [onMark]);

  const walks = props.pool.walks;
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
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: { item: Row }[] }) => looseOf.current(viewableItems.map((v) => v.item)));
  useEffect(() => {
    if (zoom === 'days') looseOf.current(rows.slice(0, 20));
  }, [rows, zoom]);

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'header') return <DayHeader day={item.day} height={item.height} />;
      if (item.kind === 'tiles')
        return (
          <View style={[styles.row, { height: item.height }]}>
            {item.tiles.map((t) => (
              <GalleryTile key={t.key} tile={t} size={cell} fit={fit} label={tileLabel(t, timeOf(t.t), walks, streets)} onPress={mark} marked={keys.has(t.key)} />
            ))}
          </View>
        );
      return <PeriodBlock block={item.block} width={width} textH={blockTextHeight(fontScale)} coverH={coverHeight(width)} fit={fit} onPress={openBlock} />;
    },
    [cell, fit, walks, streets, mark, keys, width, openBlock, fontScale],
  );
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w && w !== width) setWidth(w);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  };

  const empty = props.pool.ready ? pickerEmpty(tiles, show) : null;
  // A mark whose moment went to Undo or is gone is no longer offered, and the bar goes with it (picker media audit 2).
  const offered = useMemo(
    () => !!props.marked && markStillOffered(props.pool.moments, props.pool.walkList, { hidden, self: props.self ?? '' }, props.marked),
    [props.marked, props.pool.moments, props.pool.walkList, hidden, props.self],
  );
  const picked = props.marked && offered ? props.pool.byId.get(props.marked) : undefined;
  const bar = picked
    ? pickBar({ kind: picked.kind, words: picked.words, place: picked.place, street: streets[picked.id] ?? null, t: picked.t, walkLine: fromLine(picked.walkId ? walks.get(picked.walkId) : undefined), time: timeOf(picked.t), now })
    : null;

  return (
    <View style={styles.wrap} testID="picker-media">
      <GalleryBar idPrefix="picker" showLine={false} tall menuWord="View" zoom={zoom} show={show} onZoom={setZoom} onMenu={() => setMenu(true)} onShowAll={() => setShow('all')} />
      <View style={styles.kinds} accessibilityRole="tablist" testID="picker-kind">
        {KINDS.map((k) => {
          const on = show === k.show;
          return (
            <Pressable
              key={k.show}
              testID={`picker-kind-${k.show}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              aria-selected={on}
              onPress={() => {
                pending.current = 0;
                setShow(k.show);
              }}
              style={[styles.kind, on && styles.kindOn]}
            >
              <Text style={[styles.kindText, on && styles.kindTextOn]} numberOfLines={1}>{k.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {show !== 'all' ? <Text testID="picker-only" style={styles.only}>{ONLY[show]}</Text> : null}
      <View style={[styles.body, PAN_ONLY]} onLayout={onLayout} {...pinch}>
        {!viewReady ? null : empty ? (
          <View style={styles.quiet}>
            <Text testID="picker-empty" style={styles.quietText}>{empty}</Text>
          </View>
        ) : (
          <FlatList
            ref={list}
            key={zoom}
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
            testID="picker-list"
          />
        )}
      </View>
      <View style={styles.bar} testID="picker-bar">
        {bar ? (
          <>
            <View style={styles.barText}>
              <Text testID="picker-bar-words" style={styles.barWords} numberOfLines={1}>{bar.words}</Text>
              <Text testID="picker-bar-context" style={styles.barContext} numberOfLines={3}>{bar.context}</Text>
            </View>
            <Pressable testID="picker-action" accessibilityRole="button" accessibilityLabel={`${PICKER_ACTION[props.action]}, ${bar.words}. ${bar.context}`} onPress={() => picked && props.onPick(picked)} style={styles.action}>
              <Text style={styles.actionText}>{PICKER_ACTION[props.action]}</Text>
            </Pressable>
          </>
        ) : null}
      </View>
      <ViewMenu
        idPrefix="picker"
        inline
        showKind={false}
        open={menu}
        view={view}
        show={show}
        sizable={zoom === 'days'}
        onClose={() => setMenu(false)}
        onOrder={(order) => {
          pending.current = 0;
          setLocal((l) => ({ ...l, order }));
        }}
        onShow={setShow}
        onZoom={resize}
        onShape={(shape) => setLocal((l) => ({ ...l, shape }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 6 },
  tabs: { flexDirection: 'row', backgroundColor: theme.line, borderRadius: 10, padding: 2 },
  tab: { flex: 1, minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: theme.surface },
  tabText: { color: theme.muted, fontSize: 15, fontWeight: '600' },
  tabTextOn: { color: theme.ink },
  kinds: { flexDirection: 'row', gap: 6 },
  kind: { flex: 1, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  kindOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  kindText: { color: theme.ink, fontSize: 14, fontWeight: '600' },
  kindTextOn: { color: theme.bg },
  only: { color: theme.ink, fontSize: 14, fontWeight: '600', paddingHorizontal: 4 },
  body: { flex: 1, minHeight: 120 },
  row: { flexDirection: 'row', gap: 1 },
  quiet: { padding: 16 },
  quietText: { color: theme.ink, fontSize: 16, lineHeight: 23 },
  bar: { height: BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  barText: { flex: 1, gap: 2 },
  barWords: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  barContext: { color: theme.muted, fontSize: 13 },
  action: { minHeight: 48, minWidth: 96, borderRadius: 999, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  actionText: { color: theme.bg, fontSize: 16, fontWeight: '600' },
});
