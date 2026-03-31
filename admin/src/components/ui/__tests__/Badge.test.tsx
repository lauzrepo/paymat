import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('defaults to gray variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('gray');
  });

  it('applies green variant classes', () => {
    render(<Badge variant="green">Paid</Badge>);
    expect(screen.getByText('Paid').className).toContain('green');
  });

  it('applies red variant classes', () => {
    render(<Badge variant="red">Overdue</Badge>);
    expect(screen.getByText('Overdue').className).toContain('red');
  });

  it('applies yellow variant classes', () => {
    render(<Badge variant="yellow">Pending</Badge>);
    expect(screen.getByText('Pending').className).toContain('yellow');
  });

  it('applies blue variant classes', () => {
    render(<Badge variant="blue">Info</Badge>);
    expect(screen.getByText('Info').className).toContain('blue');
  });

  it('merges additional className', () => {
    render(<Badge className="extra-class">Label</Badge>);
    expect(screen.getByText('Label').className).toContain('extra-class');
  });
});
