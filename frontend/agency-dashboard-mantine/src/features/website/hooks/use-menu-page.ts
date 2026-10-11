import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { websiteErrorNotificationKey } from '../lib/website-error-messages.ts';
import { classifyWebsiteError } from '../lib/website-errors.ts';
import type { WebsiteDraftResponse } from '../types.ts';
import type {
  FooterColumnItem,
  FooterLegalItem,
  MenuItemInput,
  NavigationLinkItem,
} from '../types/menu.types.ts';
import type { CustomWebsitePage } from '../types/pages.types.ts';
import { useViewWebsite, type ViewWebsiteController } from './use-view-website.ts';
import { useWebsiteCapabilities } from './use-website-capabilities.ts';
import { usePublishedWebsite, useWebsiteDraft, useWebsiteMutations } from './use-website.ts';

export interface PageLinkOption {
  label: string;
  href: string;
  group: string;
}

export interface MenuPageController {
  draft: WebsiteDraftResponse | null;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  isPublished: boolean;
  canEditContent: boolean;
  canPublish: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isDirty: boolean;
  // Working state
  headerItems: NavigationLinkItem[];
  footerDescription: string;
  setFooterDescription: (desc: string) => void;
  footerColumns: FooterColumnItem[];
  footerLegal: FooterLegalItem[];
  // Available pages for quick link
  availablePageOptions: PageLinkOption[];
  // Dialog states
  isAddHeaderOpen: boolean;
  openAddHeader: () => void;
  closeAddHeader: () => void;
  editHeaderTarget: { index: number; item: NavigationLinkItem } | null;
  openEditHeader: (index: number, item: NavigationLinkItem) => void;
  closeEditHeader: () => void;
  isAddFooterColumnOpen: boolean;
  openAddFooterColumn: () => void;
  closeAddFooterColumn: () => void;
  addFooterLinkTarget: { columnIndex: number } | null;
  openAddFooterLink: (columnIndex: number) => void;
  closeAddFooterLink: () => void;
  editFooterLinkTarget: {
    columnIndex: number;
    linkIndex: number;
    item: NavigationLinkItem;
  } | null;
  openEditFooterLink: (columnIndex: number, linkIndex: number, item: NavigationLinkItem) => void;
  closeEditFooterLink: () => void;
  isAddLegalOpen: boolean;
  openAddLegal: () => void;
  closeAddLegal: () => void;
  editLegalTarget: { index: number; item: NavigationLinkItem } | null;
  openEditLegal: (index: number, item: NavigationLinkItem) => void;
  closeEditLegal: () => void;
  // Actions
  addHeaderItem: (input: MenuItemInput) => void;
  editHeaderItem: (index: number, input: MenuItemInput) => void;
  removeHeaderItem: (index: number) => void;
  moveHeaderItemUp: (index: number) => void;
  moveHeaderItemDown: (index: number) => void;
  addFooterColumn: (title: string) => void;
  removeFooterColumn: (columnIndex: number) => void;
  addFooterColumnLink: (columnIndex: number, input: MenuItemInput) => void;
  editFooterColumnLink: (columnIndex: number, linkIndex: number, input: MenuItemInput) => void;
  removeFooterColumnLink: (columnIndex: number, linkIndex: number) => void;
  addFooterLegalLink: (input: MenuItemInput) => void;
  editFooterLegalLink: (index: number, input: MenuItemInput) => void;
  removeFooterLegalLink: (index: number) => void;
  save: () => Promise<void>;
  reset: () => void;
  publish: () => void;
  viewWebsite: ViewWebsiteController;
}

export function useMenuPage(): MenuPageController {
  const { t } = useTranslation('website');
  const confirm = useConfirmDialog();
  const capabilities = useWebsiteCapabilities();
  const { saveContent, publish } = useWebsiteMutations();

  const draftQuery = useWebsiteDraft();
  const publishedQuery = usePublishedWebsite();
  const viewWebsite = useViewWebsite();

  const draft = draftQuery.data ?? null;
  const isPublished = publishedQuery.isSuccess;

  // Local working state
  const [headerItems, setHeaderItems] = useState<NavigationLinkItem[]>([]);
  const [footerDescription, setFooterDescription] = useState('');
  const [footerColumns, setFooterColumns] = useState<FooterColumnItem[]>([]);
  const [footerLegal, setFooterLegal] = useState<FooterLegalItem[]>([]);

  // Dialog states
  const [isAddHeaderOpen, setIsAddHeaderOpen] = useState(false);
  const [editHeaderTarget, setEditHeaderTarget] = useState<{
    index: number;
    item: NavigationLinkItem;
  } | null>(null);
  const [isAddFooterColumnOpen, setIsAddFooterColumnOpen] = useState(false);
  const [addFooterLinkTarget, setAddFooterLinkTarget] = useState<{
    columnIndex: number;
  } | null>(null);
  const [editFooterLinkTarget, setEditFooterLinkTarget] = useState<{
    columnIndex: number;
    linkIndex: number;
    item: NavigationLinkItem;
  } | null>(null);
  const [isAddLegalOpen, setIsAddLegalOpen] = useState(false);
  const [editLegalTarget, setEditLegalTarget] = useState<{
    index: number;
    item: NavigationLinkItem;
  } | null>(null);

  // Initialize from draft
  useEffect(() => {
    if (draft) {
      const nav = Array.isArray(draft.navigation)
        ? (draft.navigation as Array<Record<string, unknown>>).map((row) => ({
            label: typeof row.label === 'string' ? row.label : '',
            href: typeof row.href === 'string' ? row.href : '',
          }))
        : [];
      setHeaderItems(nav);

      const footer = (draft.footer ?? {}) as Record<string, unknown>;
      setFooterDescription(typeof footer.description === 'string' ? footer.description : '');

      const rawColumns = Array.isArray(footer.columns) ? footer.columns : [];
      const cols: FooterColumnItem[] = rawColumns.map((c: Record<string, unknown>) => ({
        title: typeof c.title === 'string' ? c.title : '',
        links: Array.isArray(c.links)
          ? c.links.map((l: Record<string, unknown>) => ({
              label: typeof l.label === 'string' ? l.label : '',
              href: typeof l.href === 'string' ? l.href : '',
            }))
          : [],
      }));
      setFooterColumns(cols);

      const rawLegal = Array.isArray(footer.legal) ? footer.legal : [];
      const leg: FooterLegalItem[] = rawLegal.map((l: Record<string, unknown>) => ({
        label: typeof l.label === 'string' ? l.label : '',
        href: typeof l.href === 'string' ? l.href : '',
      }));
      setFooterLegal(leg);
    }
  }, [draft]);

  // Extract available pages from content
  const availablePageOptions: PageLinkOption[] = useMemo(() => {
    const list: PageLinkOption[] = [
      { label: 'Home Page (/)', href: '/', group: 'System Pages' },
      { label: 'Tours & Catalog (/trips)', href: '/trips', group: 'System Pages' },
    ];

    if (draft?.content && typeof draft.content === 'object') {
      const rawPages = (draft.content as Record<string, unknown>).pages;
      if (Array.isArray(rawPages)) {
        rawPages.forEach((p: unknown) => {
          if (
            p !== null &&
            typeof p === 'object' &&
            typeof (p as CustomWebsitePage).title === 'string' &&
            typeof (p as CustomWebsitePage).slug === 'string'
          ) {
            const page = p as CustomWebsitePage;
            list.push({
              label: `${page.title} (${page.slug})`,
              href: page.slug,
              group: 'Custom Pages',
            });
          }
        });
      }
    }
    return list;
  }, [draft?.content]);

  // Dirty detection
  const isDirty = useMemo(() => {
    if (!draft) {
      return false;
    }
    const originalNav = Array.isArray(draft.navigation) ? draft.navigation : [];
    const navChanged = JSON.stringify(headerItems) !== JSON.stringify(originalNav);

    const originalFooter = (draft.footer ?? {}) as Record<string, unknown>;
    const origDesc =
      typeof originalFooter.description === 'string' ? originalFooter.description : '';
    const descChanged = footerDescription !== origDesc;

    const origCols = Array.isArray(originalFooter.columns) ? originalFooter.columns : [];
    const colsChanged = JSON.stringify(footerColumns) !== JSON.stringify(origCols);

    const origLegal = Array.isArray(originalFooter.legal) ? originalFooter.legal : [];
    const legalChanged = JSON.stringify(footerLegal) !== JSON.stringify(origLegal);

    return navChanged || descChanged || colsChanged || legalChanged;
  }, [draft, headerItems, footerDescription, footerColumns, footerLegal]);

  const notifyError = (error: unknown) => {
    const { kind } = classifyWebsiteError(error);
    notifications.show({ message: t(websiteErrorNotificationKey(kind)), color: 'red' });
  };

  // Header Nav Actions
  const addHeaderItem = (input: MenuItemInput) => {
    setHeaderItems((prev) => [...prev, { label: input.label.trim(), href: input.href.trim() }]);
    setIsAddHeaderOpen(false);
  };

  const editHeaderItem = (index: number, input: MenuItemInput) => {
    setHeaderItems((prev) =>
      prev.map((item, i) =>
        i === index ? { label: input.label.trim(), href: input.href.trim() } : item
      )
    );
    setEditHeaderTarget(null);
  };

  const removeHeaderItem = (index: number) => {
    setHeaderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveHeaderItemUp = (index: number) => {
    if (index === 0) {
      return;
    }
    setHeaderItems((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveHeaderItemDown = (index: number) => {
    if (index >= headerItems.length - 1) {
      return;
    }
    setHeaderItems((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Footer Actions
  const addFooterColumn = (title: string) => {
    setFooterColumns((prev) => [...prev, { title: title.trim(), links: [] }]);
    setIsAddFooterColumnOpen(false);
  };

  const removeFooterColumn = (columnIndex: number) => {
    setFooterColumns((prev) => prev.filter((_, i) => i !== columnIndex));
  };

  const addFooterColumnLink = (columnIndex: number, input: MenuItemInput) => {
    setFooterColumns((prev) =>
      prev.map((col, i) =>
        i === columnIndex
          ? {
              ...col,
              links: [...col.links, { label: input.label.trim(), href: input.href.trim() }],
            }
          : col
      )
    );
    setAddFooterLinkTarget(null);
  };

  const editFooterColumnLink = (columnIndex: number, linkIndex: number, input: MenuItemInput) => {
    setFooterColumns((prev) =>
      prev.map((col, i) =>
        i === columnIndex
          ? {
              ...col,
              links: col.links.map((link, j) =>
                j === linkIndex ? { label: input.label.trim(), href: input.href.trim() } : link
              ),
            }
          : col
      )
    );
    setEditFooterLinkTarget(null);
  };

  const removeFooterColumnLink = (columnIndex: number, linkIndex: number) => {
    setFooterColumns((prev) =>
      prev.map((col, i) =>
        i === columnIndex ? { ...col, links: col.links.filter((_, j) => j !== linkIndex) } : col
      )
    );
  };

  const addFooterLegalLink = (input: MenuItemInput) => {
    setFooterLegal((prev) => [...prev, { label: input.label.trim(), href: input.href.trim() }]);
    setIsAddLegalOpen(false);
  };

  const editFooterLegalLink = (index: number, input: MenuItemInput) => {
    setFooterLegal((prev) =>
      prev.map((item, i) =>
        i === index ? { label: input.label.trim(), href: input.href.trim() } : item
      )
    );
    setEditLegalTarget(null);
  };

  const removeFooterLegalLink = (index: number) => {
    setFooterLegal((prev) => prev.filter((_, i) => i !== index));
  };

  // Save changes
  const save = async () => {
    if (!draft) {
      return;
    }
    try {
      await saveContent.mutateAsync({
        values: {
          navigation: headerItems,
          footer: {
            description: footerDescription,
            columns: footerColumns,
            legal: footerLegal,
          },
        },
      });
      notifications.show({
        title: 'Menu saved',
        message: 'Navigation links and footer structure updated.',
        color: 'teal',
      });
    } catch (error) {
      notifyError(error);
    }
  };

  const reset = () => {
    if (!draft) {
      return;
    }
    const nav = Array.isArray(draft.navigation)
      ? (draft.navigation as Array<Record<string, unknown>>).map((row) => ({
          label: typeof row.label === 'string' ? row.label : '',
          href: typeof row.href === 'string' ? row.href : '',
        }))
      : [];
    setHeaderItems(nav);

    const footer = (draft.footer ?? {}) as Record<string, unknown>;
    setFooterDescription(typeof footer.description === 'string' ? footer.description : '');

    const rawColumns = Array.isArray(footer.columns) ? footer.columns : [];
    const cols: FooterColumnItem[] = rawColumns.map((c: Record<string, unknown>) => ({
      title: typeof c.title === 'string' ? c.title : '',
      links: Array.isArray(c.links)
        ? c.links.map((l: Record<string, unknown>) => ({
            label: typeof l.label === 'string' ? l.label : '',
            href: typeof l.href === 'string' ? l.href : '',
          }))
        : [],
    }));
    setFooterColumns(cols);

    const rawLegal = Array.isArray(footer.legal) ? footer.legal : [];
    const leg: FooterLegalItem[] = rawLegal.map((l: Record<string, unknown>) => ({
      label: typeof l.label === 'string' ? l.label : '',
      href: typeof l.href === 'string' ? l.href : '',
    }));
    setFooterLegal(leg);
  };

  const publishWebsite = () => {
    confirm({
      title: t('confirm.publishTitle'),
      message: t('confirm.publishBody'),
      onConfirm: () =>
        publish.mutate(undefined, {
          onSuccess: () => {
            notifications.show({ message: t('notifications.published'), color: 'teal' });
          },
          onError: notifyError,
        }),
    });
  };

  return {
    draft,
    isPending: draftQuery.isPending,
    isError: draftQuery.isError,
    refetch: draftQuery.refetch,
    isPublished,
    canEditContent: capabilities.canEditContent,
    canPublish: capabilities.canPublish,
    isSaving: saveContent.isPending,
    isPublishing: publish.isPending,
    isDirty,
    headerItems,
    footerDescription,
    setFooterDescription,
    footerColumns,
    footerLegal,
    availablePageOptions,
    isAddHeaderOpen,
    openAddHeader: () => setIsAddHeaderOpen(true),
    closeAddHeader: () => setIsAddHeaderOpen(false),
    editHeaderTarget,
    openEditHeader: (index, item) => setEditHeaderTarget({ index, item }),
    closeEditHeader: () => setEditHeaderTarget(null),
    isAddFooterColumnOpen,
    openAddFooterColumn: () => setIsAddFooterColumnOpen(true),
    closeAddFooterColumn: () => setIsAddFooterColumnOpen(false),
    addFooterLinkTarget,
    openAddFooterLink: (columnIndex) => setAddFooterLinkTarget({ columnIndex }),
    closeAddFooterLink: () => setAddFooterLinkTarget(null),
    editFooterLinkTarget,
    openEditFooterLink: (columnIndex, linkIndex, item) =>
      setEditFooterLinkTarget({ columnIndex, linkIndex, item }),
    closeEditFooterLink: () => setEditFooterLinkTarget(null),
    isAddLegalOpen,
    openAddLegal: () => setIsAddLegalOpen(true),
    closeAddLegal: () => setIsAddLegalOpen(false),
    editLegalTarget,
    openEditLegal: (index, item) => setEditLegalTarget({ index, item }),
    closeEditLegal: () => setEditLegalTarget(null),
    addHeaderItem,
    editHeaderItem,
    removeHeaderItem,
    moveHeaderItemUp,
    moveHeaderItemDown,
    addFooterColumn,
    removeFooterColumn,
    addFooterColumnLink,
    editFooterColumnLink,
    removeFooterColumnLink,
    addFooterLegalLink,
    editFooterLegalLink,
    removeFooterLegalLink,
    save,
    reset,
    publish: publishWebsite,
    viewWebsite,
  };
}
