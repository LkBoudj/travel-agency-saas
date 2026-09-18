import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useForm } from "react-hook-form"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useLogin } from "../hooks/use-login"
import { loginSchema, type LoginValues } from "../schemas/login.schema"
import { ApiError } from "@/lib/api"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const login = useLogin()
  const { register, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const serverErrorMessage = login.isError
    ? login.error instanceof ApiError && login.error.status === 401
      ? "Invalid email or password."
      : login.error?.message ?? "Something went wrong. Please try again."
    : undefined

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Use your platform admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => login.mutate(values))} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={!!formState.errors.email}
                  {...register("email")}
                />
                <FieldError errors={[{ message: formState.errors.email?.message }]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!formState.errors.password}
                  {...register("password")}
                />
                <FieldError
                  errors={[{ message: formState.errors.password?.message }]}
                />
              </Field>
              {serverErrorMessage ? (
                <FieldError className="text-center">{serverErrorMessage}</FieldError>
              ) : null}
              <Field>
                <Button type="submit" disabled={login.isPending}>
                  {login.isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  Sign in
                </Button>
                <FieldDescription className="text-center">
                  Only authorized platform accounts can access this dashboard.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}