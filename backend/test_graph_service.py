from app.services.graph.graph_service import graph_service

# Test search
items = graph_service.search_items("Stan")
print(f"Found {len(items)} items")
for item in items:
    print(f"- {item.name} ({item.auto_detected_type})")

# Test get influences
if items:
    influences = graph_service.get_influences(items[0].id)
    print(f"\nInfluences for {influences.main_item.name}:")
    for inf in influences.influences:
        print(f"- {inf.from_item.name}: {inf.explanation}")

# Test creators
print(f"\nCreators: {[c.name for c in influences.creators]}")
print(f"Categories: {influences.categories}")
