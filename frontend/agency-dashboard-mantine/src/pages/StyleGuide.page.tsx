import {
  Badge,
  Box,
  Button,
  Code,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { STATUS_COLORS, colors } from '@/theme/colors';

const gradientColor = (color: string, index: number) => {
  const tuple = colors[color];
  return tuple?.[index] ?? 'transparent';
};

function ColorScale({ name }: { name: string }) {
  const tuple = colors[name];
  if (!tuple) {
    return null;
  }

  return (
    <Paper withBorder p="sm">
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{name}</Text>
        <Code>{tuple[6]}</Code>
      </Group>
      <Group gap={6} wrap="nowrap">
        {tuple.map((value, index) => (
          <Box
            key={index}
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--mantine-radius-sm)',
              backgroundColor: value,
              border: '1px solid var(--mantine-color-gray-3)',
            }}
          />
        ))}
      </Group>
    </Paper>
  );
}

export function StyleGuidePage() {
  const statusEntries = Object.entries(STATUS_COLORS);

  return (
    <Box p="xl">
      <Title order={1} mb={8}>
        Style guide
      </Title>
      <Text c="dimmed" mb="xl">
        Design tokens, tuned controls and domain status colors for visual QA.
      </Text>

      <Title order={2} mb="sm" mt="xl">
        Colors
      </Title>
      <Stack gap="sm">
        {Object.keys(colors).map((name) => (
          <ColorScale key={name} name={name} />
        ))}
      </Stack>

      <Title order={2} mb="sm" mt="xl">
        Typography
      </Title>
      <Stack gap={4}>
        <Title order={1}>Heading 1</Title>
        <Title order={2}>Heading 2</Title>
        <Title order={3}>Heading 3</Title>
        <Title order={4}>Heading 4</Title>
        <Text size="xs" c="dimmed">
          Text xs
        </Text>
        <Text size="sm" c="dimmed">
          Text sm
        </Text>
        <Text size="md">Text md</Text>
        <Text size="lg">Text lg</Text>
        <Text style={{ fontVariantNumeric: 'tabular-nums' }} fw={700}>
          Tabular numerals: 1 234 567.89
        </Text>
      </Stack>

      <Title order={2} mb="sm" mt="xl">
        Controls
      </Title>
      <Stack gap="md">
        <Group gap="sm">
          <Button>Primary</Button>
          <Button variant="light">Light</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="filled" color="danger">
            Danger
          </Button>
        </Group>
        <Group align="flex-start" gap="sm">
          <TextInput label="Name" placeholder="Enter name" style={{ width: 260 }} />
          <TextInput
            label="With error"
            placeholder="Enter name"
            error="Required"
            style={{ width: 260 }}
          />
        </Group>
        <Paper withBorder w={640}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>CUS-0001</Table.Td>
                <Table.Td>
                  <Badge color="success" variant="light">
                    ACTIVE
                  </Badge>
                </Table.Td>
                <Table.Td style={{ fontVariantNumeric: 'tabular-nums' }}>1 250.00</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>CUS-0002</Table.Td>
                <Table.Td>
                  <Badge color="warning" variant="light">
                    SUSPENDED
                  </Badge>
                </Table.Td>
                <Table.Td style={{ fontVariantNumeric: 'tabular-nums' }}>880.50</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>CUS-0003</Table.Td>
                <Table.Td>
                  <Badge color="danger" variant="light">
                    CANCELLED
                  </Badge>
                </Table.Td>
                <Table.Td style={{ fontVariantNumeric: 'tabular-nums' }}>0.00</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      <Title order={2} mb="sm" mt="xl">
        Domain status colors
      </Title>
      <Group gap="sm">
        {statusEntries.map(([status, color]) => (
          <Badge key={status} color={color} variant="light">
            {status}
          </Badge>
        ))}
      </Group>

      <Title order={2} mb="sm" mt="xl">
        Derived swatches
      </Title>
      <Group gap="sm">
        {(['brand', 'success', 'warning', 'danger', 'info'] as const).map((color) => (
          <Group key={color} gap={4}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
              <Box
                key={index}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--mantine-radius-sm)',
                  backgroundColor: gradientColor(color, index),
                  border: '1px solid var(--mantine-color-gray-3)',
                }}
              />
            ))}
          </Group>
        ))}
      </Group>
    </Box>
  );
}
