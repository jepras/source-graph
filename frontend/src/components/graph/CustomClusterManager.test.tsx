import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomClusterManager } from './CustomClusterManager';
import { GraphProvider } from '../../contexts/GraphContext';

describe('CustomClusterManager', () => {
  it('renders correctly with initial state', () => {
    render(
      <GraphProvider>
        <CustomClusterManager />
      </GraphProvider>
    );

    expect(screen.getByText('Custom Clusters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New cluster name')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });
});
