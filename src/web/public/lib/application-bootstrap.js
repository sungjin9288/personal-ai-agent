export async function bootstrapApplication({
  initializeTheme,
  wireEvents,
  renderStaticSurfaces,
  loadData,
  restoreState,
  onError,
}) {
  initializeTheme();
  wireEvents();
  renderStaticSurfaces();

  try {
    await loadData();
    await restoreState();
  } catch (error) {
    onError(error);
  }
}
