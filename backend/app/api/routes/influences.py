from fastapi import APIRouter, HTTPException
from app.models.structured import StructuredOutput
from app.services.graph.graph_service import graph_service

router = APIRouter(prefix="/influences", tags=["influences"])


@router.post("/save")
async def save_structured_influences(structured_data: StructuredOutput):
    """Save structured influence data to the database"""
    try:
        # Always check for similar items (loose matching)
        similar_items = graph_service.find_similar_items(
            name=structured_data.main_item,
            creator_name=structured_data.main_item_creator,
        )

        if similar_items:
            return {
                "success": False,
                "requires_review": True,
                "similar_items": similar_items,
                "new_data": structured_data.dict(),
                "message": f"Found {len(similar_items)} potentially similar item(s). Please review before proceeding.",
            }

        # No conflicts, save normally
        main_item_id = graph_service.save_structured_influences(structured_data)

        return {
            "success": True,
            "item_id": main_item_id,
            "message": f"Successfully saved influences for '{structured_data.main_item}'",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save influences: {str(e)}"
        )


@router.get("/preview/{item_id}")
async def get_item_preview(item_id: str):
    """Get existing item data for merge preview"""
    try:
        preview_data = graph_service.get_item_preview(item_id)
        return preview_data
    except Exception as e:
        raise HTTPException(
            status_code=404, detail=f"Failed to get item preview: {str(e)}"
        )


@router.post("/force-save")
async def force_save_as_new(structured_data: StructuredOutput):
    """Force save as new item, ignoring conflicts"""
    try:
        main_item_id = graph_service.save_structured_influences(structured_data)
        return {
            "success": True,
            "item_id": main_item_id,
            "message": f"Successfully created new item '{structured_data.main_item}'",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save influences: {str(e)}"
        )


@router.post("/merge")
async def merge_with_existing(merge_request: dict):
    """Merge new influences with existing item (supports comprehensive influence-level resolutions)"""
    try:
        # Validate required fields
        if "existing_item_id" not in merge_request:
            raise HTTPException(status_code=400, detail="Missing existing_item_id")
        if "new_data" not in merge_request:
            raise HTTPException(status_code=400, detail="Missing new_data")

        existing_item_id = merge_request["existing_item_id"]
        influence_resolutions = merge_request.get("influence_resolutions", {})

        # Parse new_data more safely
        try:
            new_data = StructuredOutput(**merge_request["new_data"])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid new_data format: {e}")

        # If influence_resolutions is provided, handle comprehensive merge
        if influence_resolutions:
            # Process influence resolutions
            processed_influences = []

            for i, influence in enumerate(new_data.influences):
                influence_key = str(i)

                if influence_key in influence_resolutions:
                    resolution = influence_resolutions[influence_key]

                    if resolution.get("resolution") == "merge" and resolution.get(
                        "selectedItemId"
                    ):
                        # Merge with existing influence item - create relationship from existing item to main item
                        selected_item_id = resolution["selectedItemId"]

                        # Create influence relationship from the existing influence item to the main item
                        graph_service.create_influence_relationship(
                            from_item_id=selected_item_id,  # The existing influence item
                            to_item_id=existing_item_id,  # The main item (Beastie Boys' 'Licensed to Ill')
                            confidence=influence.confidence,
                            influence_type=influence.influence_type,
                            explanation=influence.explanation,
                            category=influence.category,
                            scope=influence.scope,
                            source=influence.source,
                            year_of_influence=influence.year,
                            clusters=influence.clusters,
                        )
                    else:
                        # Create new influence item
                        processed_influences.append(influence)
                else:
                    # No resolution specified, create new
                    processed_influences.append(influence)

            # Update new_data with processed influences
            new_data.influences = processed_influences

            # Add remaining influences to the main item
            if processed_influences:
                result_id = graph_service.add_influences_to_existing(
                    existing_item_id, new_data
                )
            else:
                result_id = existing_item_id

            return {
                "success": True,
                "item_id": result_id,
                "message": f"Successfully merged with comprehensive resolutions. Created {len(processed_influences)} new influences.",
            }
        else:
            # Original simple merge behavior
            result_id = graph_service.add_influences_to_existing(
                existing_item_id, new_data
            )

            return {
                "success": True,
                "item_id": result_id,
                "message": "Successfully merged influences with existing item",
            }

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to merge influences: {str(e)}"
        )


@router.post("/save-with-resolutions")
async def save_with_comprehensive_resolutions(save_request: dict):
    """Save new item with comprehensive influence-level resolutions"""
    try:
        # Validate required fields
        if "new_data" not in save_request:
            raise HTTPException(status_code=400, detail="Missing new_data")

        influence_resolutions = save_request.get("influence_resolutions", {})

        # Parse new_data more safely
        try:
            new_data = StructuredOutput(**save_request["new_data"])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid new_data format: {e}")

        # Process influence resolutions
        processed_influences = []

        for i, influence in enumerate(new_data.influences):
            influence_key = str(i)

            if influence_key in influence_resolutions:
                resolution = influence_resolutions[influence_key]

                if resolution.get("resolution") == "merge" and resolution.get(
                    "selectedItemId"
                ):
                    # Skip this influence - it will be handled by creating relationships
                    # The relationship will be created after the main item is saved
                    continue
                else:
                    # Create new influence item
                    processed_influences.append(influence)
            else:
                # No resolution specified, create new
                processed_influences.append(influence)

        # Update new_data with processed influences (only the ones to create new)
        new_data.influences = processed_influences

        # Save the main item with the filtered influences
        main_item_id = graph_service.save_structured_influences(new_data)

        # Now handle the merge relationships
        for i, influence in enumerate(save_request["new_data"]["influences"]):
            influence_key = str(i)

            if influence_key in influence_resolutions:
                resolution = influence_resolutions[influence_key]

                if resolution.get("resolution") == "merge" and resolution.get(
                    "selectedItemId"
                ):
                    # Create influence relationship from the existing influence item to the main item
                    selected_item_id = resolution["selectedItemId"]

                    graph_service.create_influence_relationship(
                        from_item_id=selected_item_id,  # The existing influence item
                        to_item_id=main_item_id,  # The newly created main item
                        confidence=influence["confidence"],
                        influence_type=influence["influence_type"],
                        explanation=influence["explanation"],
                        category=influence["category"],
                        scope=influence["scope"],
                        source=influence.get("source"),
                        year_of_influence=influence.get("year"),
                        clusters=influence.get("clusters"),
                    )

        return {
            "success": True,
            "item_id": main_item_id,
            "message": f"Successfully created new item with comprehensive resolutions. Created {len(processed_influences)} new influences.",
        }

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save with comprehensive resolutions: {str(e)}",
        )


@router.get("/test")
async def test_save():
    """Test endpoint to verify influences routes work"""
    return {"message": "Influences API working"}
