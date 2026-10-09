import { IconArrowDown, IconArrowUp, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Code,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { ContentContainer } from '../../../../components/content-container.tsx';
import { EmptyState } from '../../../../components/empty-state.tsx';
import { PageHeader } from '../../../../components/page-header.tsx';
import { Panel } from '../../../../components/panel.tsx';
import { SectionHeader } from '../../../../components/section-header.tsx';
import { StatusBadge } from '../../../../components/status-badge.tsx';
import type { MenuPageController } from '../../hooks/use-menu-page.ts';
import { ViewWebsiteButton } from '../view-website-button.tsx';

export function MenuView({
  isPublished,
  canEditContent,
  canPublish,
  isSaving,
  isPublishing,
  isDirty,
  headerItems,
  footerDescription,
  setFooterDescription,
  footerColumns,
  footerLegal,
  openAddHeader,
  openEditHeader,
  removeHeaderItem,
  moveHeaderItemUp,
  moveHeaderItemDown,
  openAddFooterColumn,
  removeFooterColumn,
  openAddFooterLink,
  openEditFooterLink,
  removeFooterColumnLink,
  openAddLegal,
  openEditLegal,
  removeFooterLegalLink,
  save,
  reset,
  publish,
  viewWebsite,
}: MenuPageController) {
  return (
    <ContentContainer>
      <Stack gap="lg">
        <PageHeader
          title="Menu & Navigation"
          subtitle="Configure the header navigation bar, footer columns, and legal links of your public website."
          meta={
            <Group gap="xs">
              <StatusBadge status={isPublished ? 'published' : 'draft'} />
              <Badge variant="light" color="blue">
                {headerItems.length} Header Links
              </Badge>
              <Badge variant="light" color="gray">
                {footerColumns.length} Footer Columns
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
                  loading={isSaving}
                  disabled={!isDirty}
                  onClick={save}
                  styles={{
                    root: {
                      backgroundColor: 'var(--app-action-primary)',
                      fontWeight: 600,
                    },
                  }}
                >
                  Save Changes
                </Button>
              ) : null}
            </Group>
          }
        />

        <Tabs defaultValue="header">
          <Tabs.List>
            <Tabs.Tab value="header">Header Navigation</Tabs.Tab>
            <Tabs.Tab value="footer">Footer Navigation</Tabs.Tab>
          </Tabs.List>

          {/* Header Navigation Tab */}
          <Tabs.Panel value="header" pt="lg">
            <Panel>
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <SectionHeader
                    title="Header Navigation Links"
                    description="The main navigation links visitors see at the top of every storefront page."
                  />
                  {canEditContent ? (
                    <Button
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={openAddHeader}
                      styles={{
                        root: {
                          backgroundColor: 'var(--app-action-primary)',
                          fontWeight: 600,
                        },
                      }}
                    >
                      Add Link
                    </Button>
                  ) : null}
                </Group>

                {headerItems.length === 0 ? (
                  <EmptyState
                    compact
                    title="No header navigation links"
                    description="Add links to guide visitors to your key landing pages and tours catalog."
                    action={
                      canEditContent ? (
                        <Button
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          onClick={openAddHeader}
                        >
                          Add First Link
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  <Table verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: 100 }}>Order</Table.Th>
                        <Table.Th>Label</Table.Th>
                        <Table.Th>Destination Path</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {headerItems.map((item, index) => (
                        <Table.Tr key={`nav-${index}`}>
                          <Table.Td>
                            <Group gap={4}>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                disabled={index === 0 || !canEditContent}
                                onClick={() => moveHeaderItemUp(index)}
                                aria-label="Move link up"
                              >
                                <IconArrowUp size={14} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                disabled={index === headerItems.length - 1 || !canEditContent}
                                onClick={() => moveHeaderItemDown(index)}
                                aria-label="Move link down"
                              >
                                <IconArrowDown size={14} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600} size="sm">
                              {item.label}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Code>{item.href}</Code>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Group gap="xs" justify="flex-end">
                              {canEditContent ? (
                                <>
                                  <Tooltip label="Edit link">
                                    <ActionIcon
                                      variant="subtle"
                                      color="blue"
                                      onClick={() => openEditHeader(index, item)}
                                      aria-label={`Edit ${item.label}`}
                                    >
                                      <IconEdit size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Delete link">
                                    <ActionIcon
                                      variant="subtle"
                                      color="red"
                                      onClick={() => removeHeaderItem(index)}
                                      aria-label={`Delete ${item.label}`}
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
              </Stack>
            </Panel>
          </Tabs.Panel>

          {/* Footer Navigation Tab */}
          <Tabs.Panel value="footer" pt="lg">
            <Stack gap="lg">
              {/* Footer Description */}
              <Panel>
                <SectionHeader
                  title="Footer Agency Description"
                  description="A short descriptive tagline or statement rendered above your footer navigation links."
                />
                <Textarea
                  placeholder="e.g. Crafted travel experiences delivering unforgettable memories across Algeria."
                  value={footerDescription}
                  onChange={(e) => setFooterDescription(e.currentTarget.value)}
                  disabled={!canEditContent}
                  minRows={2}
                  maxRows={4}
                  autosize
                />
              </Panel>

              {/* Footer Columns */}
              <Panel>
                <Group justify="space-between" align="center" mb="md">
                  <SectionHeader
                    title="Footer Link Columns"
                    description="Grouped columns of navigation and informational links shown in the footer."
                  />
                  {canEditContent ? (
                    <Button
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={openAddFooterColumn}
                      styles={{
                        root: {
                          backgroundColor: 'var(--app-action-primary)',
                          fontWeight: 600,
                        },
                      }}
                    >
                      Add Column
                    </Button>
                  ) : null}
                </Group>

                {footerColumns.length === 0 ? (
                  <EmptyState
                    compact
                    title="No footer columns configured"
                    description="Add columns like 'Explore', 'Company', or 'Customer Support' to structure your footer links."
                    action={
                      canEditContent ? (
                        <Button
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          onClick={openAddFooterColumn}
                        >
                          Add First Column
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    {footerColumns.map((col, colIndex) => (
                      <Card
                        key={`col-${colIndex}`}
                        withBorder
                        padding="sm"
                        radius="sm"
                        style={{ backgroundColor: 'var(--app-surface-subtle)' }}
                      >
                        <Stack gap="xs">
                          <Group justify="space-between" align="center">
                            <Text fw={600} size="sm">
                              {col.title}
                            </Text>
                            {canEditContent ? (
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => removeFooterColumn(colIndex)}
                                aria-label={`Remove column ${col.title}`}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            ) : null}
                          </Group>
                          <Divider />
                          <Stack gap={6}>
                            {col.links.length === 0 ? (
                              <Text size="xs" c="dimmed">
                                No links in this column.
                              </Text>
                            ) : (
                              col.links.map((link, linkIndex) => (
                                <Group
                                  key={`col-link-${linkIndex}`}
                                  justify="space-between"
                                  align="center"
                                  wrap="nowrap"
                                >
                                  <div>
                                    <Text size="xs" fw={500}>
                                      {link.label}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {link.href}
                                    </Text>
                                  </div>
                                  {canEditContent ? (
                                    <Group gap={4}>
                                      <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        color="blue"
                                        onClick={() =>
                                          openEditFooterLink(colIndex, linkIndex, link)
                                        }
                                        aria-label="Edit link"
                                      >
                                        <IconEdit size={12} />
                                      </ActionIcon>
                                      <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        color="red"
                                        onClick={() => removeFooterColumnLink(colIndex, linkIndex)}
                                        aria-label="Delete link"
                                      >
                                        <IconTrash size={12} />
                                      </ActionIcon>
                                    </Group>
                                  ) : null}
                                </Group>
                              ))
                            )}
                          </Stack>
                          {canEditContent ? (
                            <Button
                              variant="subtle"
                              size="xs"
                              leftSection={<IconPlus size={12} />}
                              onClick={() => openAddFooterLink(colIndex)}
                              mt="xs"
                            >
                              Add Link
                            </Button>
                          ) : null}
                        </Stack>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </Panel>

              {/* Legal Links */}
              <Panel>
                <Group justify="space-between" align="center" mb="sm">
                  <SectionHeader
                    title="Legal Links"
                    description="Compliance and legal links rendered in the bottom strip of the footer."
                  />
                  {canEditContent ? (
                    <Button
                      size="xs"
                      variant="default"
                      leftSection={<IconPlus size={14} />}
                      onClick={openAddLegal}
                    >
                      Add Legal Link
                    </Button>
                  ) : null}
                </Group>

                {footerLegal.length === 0 ? (
                  <EmptyState
                    compact
                    title="No legal links"
                    description="Standard links include Privacy Policy, Terms of Service, and Refund Policy."
                  />
                ) : (
                  <Table verticalSpacing="xs">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Label</Table.Th>
                        <Table.Th>Destination Path</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {footerLegal.map((item, index) => (
                        <Table.Tr key={`legal-${index}`}>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {item.label}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Code>{item.href}</Code>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Group gap="xs" justify="flex-end">
                              {canEditContent ? (
                                <>
                                  <ActionIcon
                                    variant="subtle"
                                    color="blue"
                                    onClick={() => openEditLegal(index, item)}
                                    aria-label="Edit legal link"
                                  >
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    onClick={() => removeFooterLegalLink(index)}
                                    aria-label="Delete legal link"
                                  >
                                    <IconTrash size={16} />
                                  </ActionIcon>
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
          </Tabs.Panel>
        </Tabs>

        {/* Sticky save bar */}
        {canEditContent ? (
          <div className="app-sticky-save-bar">
            <Group justify="space-between" align="center" gap="sm" wrap="wrap">
              <Text size="sm" c={isDirty ? 'brand.7' : 'dimmed'} fw={isDirty ? 600 : 400}>
                {isDirty ? 'Unsaved changes to navigation' : 'Navigation is up to date.'}
              </Text>
              <Group gap="xs">
                {isDirty ? (
                  <Button variant="default" onClick={reset} disabled={isSaving}>
                    Discard
                  </Button>
                ) : null}
                <Button
                  loading={isSaving}
                  disabled={!isDirty}
                  onClick={save}
                  styles={{
                    root: {
                      backgroundColor: 'var(--app-action-primary)',
                      fontWeight: 600,
                    },
                  }}
                >
                  Save Navigation
                </Button>
              </Group>
            </Group>
          </div>
        ) : null}
      </Stack>
    </ContentContainer>
  );
}
