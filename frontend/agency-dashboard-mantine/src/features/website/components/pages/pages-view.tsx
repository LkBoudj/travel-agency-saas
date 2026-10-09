import {
  IconEdit,
  IconEye,
  IconFileText,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import {
  ActionIcon,
  Badge,
  Button,
  Code,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { ContentContainer } from '../../../../components/content-container.tsx';
import { EmptyState } from '../../../../components/empty-state.tsx';
import { PageHeader } from '../../../../components/page-header.tsx';
import { Panel } from '../../../../components/panel.tsx';
import { SectionHeader } from '../../../../components/section-header.tsx';
import { StatusBadge } from '../../../../components/status-badge.tsx';
import type { PagesPageController } from '../../hooks/use-pages-page.ts';
import { ViewWebsiteButton } from '../view-website-button.tsx';

export function PagesView({
  systemPages,
  customPages,
  filteredCustomPages,
  searchQuery,
  setSearchQuery,
  isPublished,
  canEditContent,
  canPublish,
  isPublishing,
  openCreate,
  openEdit,
  openDeleteConfirm,
  openHomeSectionsDrawer,
  togglePageStatus,
  publish,
  viewWebsite,
}: PagesPageController) {
  return (
    <ContentContainer>
      <Stack gap="lg">
        <PageHeader
          title="Pages"
          subtitle="Manage the system and custom content pages of your public website."
          meta={
            <Group gap="xs">
              <StatusBadge status={isPublished ? 'published' : 'draft'} />
              <Badge variant="light" color="blue">
                {systemPages.length + customPages.length} Pages
              </Badge>
            </Group>
          }
          actions={
            <Group gap="xs">
              <ViewWebsiteButton controller={viewWebsite} />
              {canPublish ? (
                <Button
                  color="blue"
                  loading={isPublishing}
                  onClick={publish}
                  styles={{
                    root: {
                      backgroundColor: 'var(--app-action-primary)',
                      fontWeight: 600,
                    },
                  }}
                >
                  Publish
                </Button>
              ) : null}
              {canEditContent ? (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={openCreate}
                  styles={{
                    root: {
                      backgroundColor: 'var(--app-action-primary)',
                      fontWeight: 600,
                    },
                  }}
                >
                  Add Page
                </Button>
              ) : null}
            </Group>
          }
        />

        {/* Search bar */}
        <TextInput
          placeholder="Search pages by title or URL slug..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          size="sm"
          styles={{
            input: {
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            },
          }}
        />

        {/* System Pages */}
        <Panel>
          <SectionHeader
            title="System Pages"
            description="Core storefront landing pages defined and handled by your selected theme."
          />
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Page Title</Table.Th>
                <Table.Th>Slug</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {systemPages.map((page) => (
                <Table.Tr key={page.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconFileText size={18} color="var(--app-action-primary)" />
                      <div>
                        <Text fw={600} size="sm">
                          {page.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {page.description}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Code>{page.slug}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="gray" size="sm">
                      System
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status="published" />
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end">
                      {page.id === 'home' && canEditContent ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconSettings size={14} />}
                          onClick={openHomeSectionsDrawer}
                        >
                          Customize Sections
                        </Button>
                      ) : null}
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<IconEye size={14} />}
                        onClick={viewWebsite.open}
                      >
                        Preview
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Panel>

        {/* Custom Pages */}
        <Panel>
          <SectionHeader
            title="Custom Pages"
            description="Agency-specific informational and marketing pages created by your team."
          />
          {customPages.length === 0 ? (
            <EmptyState
              compact
              title="No custom pages yet"
              description="Create pages like About Us, Terms & Conditions, or Agency FAQ to inform your visitors."
              action={
                canEditContent ? (
                  <Button
                    size="xs"
                    leftSection={<IconPlus size={14} />}
                    onClick={openCreate}
                    styles={{
                      root: {
                        backgroundColor: 'var(--app-action-primary)',
                        fontWeight: 600,
                      },
                    }}
                  >
                    Create First Page
                  </Button>
                ) : undefined
              }
            />
          ) : filteredCustomPages.length === 0 ? (
            <EmptyState
              compact
              title="No pages found"
              description="Try adjusting your search terms."
            />
          ) : (
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Page Title</Table.Th>
                  <Table.Th>Slug</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Last Updated</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredCustomPages.map((page) => (
                  <Table.Tr key={page.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <IconFileText size={18} color="var(--app-action-primary)" />
                        <Text fw={600} size="sm">
                          {page.title}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Code>{page.slug}</Code>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge status={page.isPublished ? 'published' : 'draft'} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap="xs" justify="flex-end">
                        {canEditContent ? (
                          <>
                            <Tooltip label="Edit page">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() => openEdit(page)}
                                aria-label={`Edit ${page.title}`}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Button
                              size="xs"
                              variant="subtle"
                              color={page.isPublished ? 'gray' : 'teal'}
                              onClick={() => togglePageStatus(page.id)}
                            >
                              {page.isPublished ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Tooltip label="Delete page">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => openDeleteConfirm(page)}
                                aria-label={`Delete ${page.title}`}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        ) : null}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Panel>
      </Stack>
    </ContentContainer>
  );
}
