export async function getFavoritesClient(): Promise<string[]> {
  const res = await fetch('/api/favorites', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Unauthorized');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch favorites');
  }

  return res.json();
}

export async function addFavoriteClient(roomId: string): Promise<any> {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomId }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Unauthorized');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add favorite');
  }

  return res.json();
}

export async function removeFavoriteClient(roomId: string): Promise<any> {
  const res = await fetch(`/api/favorites/${roomId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Unauthorized');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to remove favorite');
  }

  return res.json();
}
