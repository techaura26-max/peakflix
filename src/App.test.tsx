import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';
import './i18n';

describe('application navigation', () => {
  it('navigates from Privacy to the local library without an account', async () => {
    render(<MemoryRouter initialEntries={['/privacy']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Privacy' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'My Library' }));
    expect(await screen.findByRole('heading', { name: 'My Library' })).toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });
});
