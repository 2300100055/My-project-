import { test, expect } from "@playwright/test";

test.describe("Verity E2E", () => {
  test("home page renders Apple-style upload UI and limitations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Is this AI-generated/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "image" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/Not detected.*never means.*authentic/i).first()).toBeVisible();
  });

  test("switching between Image and Video tabs updates limits", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "video" }).click();
    await expect(page.getByText(/\.mp4, \.mov, \.webm/i)).toBeVisible();
    await page.getByRole("tab", { name: "image" }).click();
    await expect(page.getByText(/\.jpg, \.jpeg, \.png/i)).toBeVisible();
  });

  test("how-it-works and privacy pages load", async ({ page }) => {
    await page.goto("/how-it-works");
    await expect(page.getByRole("heading", { name: /How Verity Works/i })).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /^Privacy$/i })).toBeVisible();
  });
});
