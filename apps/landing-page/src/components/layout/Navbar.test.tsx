// @vitest-environment jsdom
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Navbar } from './Navbar'

const PATHS = ['/', '/services', '/book-order', '/my-orders', '/pricing']

function renderNavbar() {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Navbar />
        <Outlet />
      </>
    ),
  })
  const routeTree = rootRoute.addChildren(
    PATHS.map((path) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => <p>page {path}</p>,
      }),
    ),
  )
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(<RouterProvider router={router} />)
  return router
}

async function openableMenu() {
  const toggle = await screen.findByRole('button', { name: 'Open menu' })
  const menuId = toggle.getAttribute('aria-controls')
  expect(menuId).toBeTruthy()
  const menu = document.getElementById(menuId!)
  expect(menu).not.toBeNull()
  return { toggle, menu: menu! }
}

describe('Navbar mobile menu', () => {
  // The router restores scroll on navigation; jsdom does not implement it.
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('starts closed with an accessible toggle', async () => {
    renderNavbar()
    const { toggle, menu } = await openableMenu()

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(menu.hidden).toBe(true)
  })

  it('opens on tap and closes on Escape, returning focus to the toggle', async () => {
    renderNavbar()
    const { toggle, menu } = await openableMenu()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-label')).toBe('Close menu')
    expect(menu.hidden).toBe(false)
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([...PATHS, '#get-the-app'])

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(menu.hidden).toBe(true)
    expect(document.activeElement).toBe(toggle)
  })

  it('toggles closed when tapped again', async () => {
    renderNavbar()
    const { toggle, menu } = await openableMenu()

    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(menu.hidden).toBe(true)
  })

  it('navigates and closes when a menu link is followed', async () => {
    const router = renderNavbar()
    const { toggle, menu } = await openableMenu()

    fireEvent.click(toggle)
    fireEvent.click(within(menu).getByRole('link', { name: 'Services' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/services'),
    )
    expect(await screen.findByText('page /services')).toBeTruthy()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(menu.hidden).toBe(true)
  })

  it('closes when the route changes some other way (e.g. back button)', async () => {
    const router = renderNavbar()
    const { toggle, menu } = await openableMenu()

    fireEvent.click(toggle)
    expect(menu.hidden).toBe(false)

    await act(() => router.navigate({ to: '/pricing' }))
    expect(router.state.location.pathname).toBe('/pricing')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(menu.hidden).toBe(true)

    // Going back to the page it was opened on must not resurrect it.
    act(() => router.history.back())
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(menu.hidden).toBe(true)
  })
})
