import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { websiteErrorNotificationKey } from '../lib/website-error-messages.ts';
import { classifyWebsiteError } from '../lib/website-errors.ts';
import type { WebsiteDraftResponse } from '../types.ts';
import type {
  CreatePageInput,
  CustomWebsitePage,
  HomeSectionsInput,
  SystemWebsitePage,
  UpdatePageInput,
} from '../types/pages.types.ts';
import { useViewWebsite, type ViewWebsiteController } from './use-view-website.ts';
import { useWebsiteCapabilities } from './use-website-capabilities.ts';
import { usePublishedWebsite, useWebsiteDraft, useWebsiteMutations } from './use-website.ts';

export interface PagesPageController {
  draft: WebsiteDraftResponse | null;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  systemPages: SystemWebsitePage[];
  customPages: CustomWebsitePage[];
  filteredCustomPages: CustomWebsitePage[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isPublished: boolean;
  canEditContent: boolean;
  canPublish: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  // Modal / Drawer state
  isCreateOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;
  editTarget: CustomWebsitePage | null;
  openEdit: (page: CustomWebsitePage) => void;
  closeEdit: () => void;
  deleteTarget: CustomWebsitePage | null;
  openDeleteConfirm: (page: CustomWebsitePage) => void;
  closeDeleteConfirm: () => void;
  isHomeSectionsDrawerOpen: boolean;
  openHomeSectionsDrawer: () => void;
  closeHomeSectionsDrawer: () => void;
  // Actions
  createPage: (input: CreatePageInput) => Promise<void>;
  updatePage: (id: string, input: UpdatePageInput) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  togglePageStatus: (id: string) => Promise<void>;
  saveHomeSections: (sections: HomeSectionsInput) => Promise<void>;
  publish: () => void;
  viewWebsite: ViewWebsiteController;
}

export function usePagesPage(): PagesPageController {
  const { t } = useTranslation('website');
  const confirm = useConfirmDialog();
  const capabilities = useWebsiteCapabilities();
  const { saveContent, publish } = useWebsiteMutations();

  const draftQuery = useWebsiteDraft();
  const publishedQuery = usePublishedWebsite();
  const viewWebsite = useViewWebsite();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomWebsitePage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomWebsitePage | null>(null);
  const [isHomeSectionsDrawerOpen, setIsHomeSectionsDrawerOpen] = useState(false);

  const isPublished = publishedQuery.isSuccess;

  const notifyError = (error: unknown) => {
    const { kind } = classifyWebsiteError(error);
    notifications.show({ message: t(websiteErrorNotificationKey(kind)), color: 'red' });
  };

  const systemPages: SystemWebsitePage[] = useMemo(
    () => [
      {
        id: 'home',
        title: 'Home Page',
        slug: '/',
        kind: 'system',
        isPublished: true,
        description:
          'Main storefront landing page with hero, promotion banner, trust points, and testimonials.',
      },
      {
        id: 'trips',
        title: 'Tours & Trips Catalog',
        slug: '/trips',
        kind: 'system',
        isPublished: true,
        description: 'Public catalog listing all active published tours and package departures.',
      },
    ],
    []
  );

  const customPages: CustomWebsitePage[] = useMemo(() => {
    if (!draftQuery.data?.content || typeof draftQuery.data.content !== 'object') {
      return [];
    }
    const rawPages = (draftQuery.data.content as Record<string, unknown>).pages;
    if (!Array.isArray(rawPages)) {
      return [];
    }
    return rawPages.filter((entry): entry is CustomWebsitePage => {
      return (
        entry !== null &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' &&
        typeof entry.title === 'string' &&
        typeof entry.slug === 'string'
      );
    });
  }, [draftQuery.data?.content]);

  const filteredCustomPages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return customPages;
    }
    return customPages.filter(
      (p) => p.title.toLowerCase().includes(query) || p.slug.toLowerCase().includes(query)
    );
  }, [customPages, searchQuery]);

  const createPage = async (input: CreatePageInput) => {
    if (!draftQuery.data) {
      return;
    }
    const formattedSlug = input.slug.trim().startsWith('/')
      ? input.slug.trim()
      : `/${input.slug.trim()}`;

    const newPage: CustomWebsitePage = {
      id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: input.title.trim(),
      slug: formattedSlug,
      content: input.content,
      isPublished: input.isPublished,
      updatedAt: new Date().toISOString(),
    };

    const nextPages = [...customPages, newPage];
    const nextContent = {
      ...draftQuery.data.content,
      pages: nextPages,
    };

    try {
      await saveContent.mutateAsync({
        values: { content: nextContent },
      });
      notifications.show({
        title: 'Page created',
        message: `"${newPage.title}" has been saved.`,
        color: 'teal',
      });
      setIsCreateOpen(false);
    } catch (error) {
      notifyError(error);
    }
  };

  const updatePage = async (id: string, input: UpdatePageInput) => {
    if (!draftQuery.data) {
      return;
    }
    const formattedSlug = input.slug.trim().startsWith('/')
      ? input.slug.trim()
      : `/${input.slug.trim()}`;

    const nextPages = customPages.map((page) =>
      page.id === id
        ? {
            ...page,
            title: input.title.trim(),
            slug: formattedSlug,
            content: input.content,
            isPublished: input.isPublished,
            updatedAt: new Date().toISOString(),
          }
        : page
    );

    const nextContent = {
      ...draftQuery.data.content,
      pages: nextPages,
    };

    try {
      await saveContent.mutateAsync({
        values: { content: nextContent },
      });
      notifications.show({
        title: 'Page updated',
        message: 'Changes saved successfully.',
        color: 'teal',
      });
      setEditTarget(null);
    } catch (error) {
      notifyError(error);
    }
  };

  const deletePage = async (id: string) => {
    if (!draftQuery.data) {
      return;
    }
    const target = customPages.find((p) => p.id === id);
    const nextPages = customPages.filter((p) => p.id !== id);
    const nextContent = {
      ...draftQuery.data.content,
      pages: nextPages,
    };

    try {
      await saveContent.mutateAsync({
        values: { content: nextContent },
      });
      notifications.show({
        title: 'Page deleted',
        message: target ? `"${target.title}" was deleted.` : 'Page was deleted.',
        color: 'blue',
      });
      setDeleteTarget(null);
    } catch (error) {
      notifyError(error);
    }
  };

  const togglePageStatus = async (id: string) => {
    if (!draftQuery.data) {
      return;
    }
    const target = customPages.find((p) => p.id === id);
    if (!target) {
      return;
    }

    const nextStatus = !target.isPublished;
    const nextPages = customPages.map((page) =>
      page.id === id
        ? {
            ...page,
            isPublished: nextStatus,
            updatedAt: new Date().toISOString(),
          }
        : page
    );

    const nextContent = {
      ...draftQuery.data.content,
      pages: nextPages,
    };

    try {
      await saveContent.mutateAsync({
        values: { content: nextContent },
      });
      notifications.show({
        message: `"${target.title}" is now ${nextStatus ? 'published' : 'draft'}.`,
        color: 'teal',
      });
    } catch (error) {
      notifyError(error);
    }
  };

  const saveHomeSections = async (sections: HomeSectionsInput) => {
    if (!draftQuery.data) {
      return;
    }
    const nextContent = {
      ...draftQuery.data.content,
      hero: sections.hero,
      trustPoints: sections.trustPoints,
      promotion: sections.promotion,
      testimonials: sections.testimonials,
      finalCta: sections.finalCta,
    };

    try {
      await saveContent.mutateAsync({
        values: { content: nextContent },
      });
      notifications.show({
        title: 'Home sections saved',
        message: 'Home page sections updated successfully.',
        color: 'teal',
      });
      setIsHomeSectionsDrawerOpen(false);
    } catch (error) {
      notifyError(error);
    }
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
    draft: draftQuery.data ?? null,
    isPending: draftQuery.isPending,
    isError: draftQuery.isError,
    refetch: draftQuery.refetch,
    systemPages,
    customPages,
    filteredCustomPages,
    searchQuery,
    setSearchQuery,
    isPublished,
    canEditContent: capabilities.canEditContent,
    canPublish: capabilities.canPublish,
    isSaving: saveContent.isPending,
    isPublishing: publish.isPending,
    isCreateOpen,
    openCreate: () => setIsCreateOpen(true),
    closeCreate: () => setIsCreateOpen(false),
    editTarget,
    openEdit: (page: CustomWebsitePage) => setEditTarget(page),
    closeEdit: () => setEditTarget(null),
    deleteTarget,
    openDeleteConfirm: (page: CustomWebsitePage) => setDeleteTarget(page),
    closeDeleteConfirm: () => setDeleteTarget(null),
    isHomeSectionsDrawerOpen,
    openHomeSectionsDrawer: () => setIsHomeSectionsDrawerOpen(true),
    closeHomeSectionsDrawer: () => setIsHomeSectionsDrawerOpen(false),
    createPage,
    updatePage,
    deletePage,
    togglePageStatus,
    saveHomeSections,
    publish: publishWebsite,
    viewWebsite,
  };
}
