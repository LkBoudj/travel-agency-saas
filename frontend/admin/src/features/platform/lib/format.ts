const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—"
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return dateFormatter.format(date)
}
