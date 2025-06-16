def generate_jsoncss_extraction_prompt(cleaned_html: str) -> str:
    """
    Generate a prompt for creating JsonCssExtractionStrategy schema based on HTML content.
    
    Args:
        cleaned_html (str): The HTML content to analyze for extraction schema generation
        
    Returns:
        str: A formatted prompt for generating the JsonCssExtractionStrategy
    """
    
    example_schema = """
   schema = {
    "name": "E-commerce Product Catalog",
    "baseSelector": "div.category",
    # (1) We can define optional baseFields if we want to extract attributes 
    # from the category container
    "baseFields": [
        {"name": "data_cat_id", "type": "attribute", "attribute": "data-cat-id"}, 
    ],
    "fields": [
        {
            "name": "category_name",
            "selector": "h2.category-name",
            "type": "text"
        },
        {
            "name": "products",
            "selector": "div.product",
            "type": "nested_list",    # repeated sub-objects
            "fields": [
                {
                    "name": "name",
                    "selector": "h3.product-name",
                    "type": "text"
                },
                {
                    "name": "price",
                    "selector": "p.product-price",
                    "type": "text"
                },
                {
                    "name": "details",
                    "selector": "div.product-details",
                    "type": "nested",  # single sub-object
                    "fields": [
                        {
                            "name": "brand",
                            "selector": "span.brand",
                            "type": "text"
                        },
                        {
                            "name": "model",
                            "selector": "span.model",
                            "type": "text"
                        }
                    ]
                },
                {
                    "name": "features",
                    "selector": "ul.product-features li",
                    "type": "list",
                    "fields": [
                        {"name": "feature", "type": "text"} 
                    ]
                },
                {
                    "name": "reviews",
                    "selector": "div.review",
                    "type": "nested_list",
                    "fields": [
                        {
                            "name": "reviewer", 
                            "selector": "span.reviewer", 
                            "type": "text"
                        },
                        {
                            "name": "rating", 
                            "selector": "span.rating", 
                            "type": "text"
                        },
                        {
                            "name": "comment", 
                            "selector": "p.review-text", 
                            "type": "text"
                        }
                    ]
                },
                {
                    "name": "related_products",
                    "selector": "ul.related-products li",
                    "type": "list",
                    "fields": [
                        {
                            "name": "name", 
                            "selector": "span.related-name", 
                            "type": "text"
                        },
                        {
                            "name": "price", 
                            "selector": "span.related-price", 
                            "type": "text"
                        }
                    ]
                }
            ]
        }
    ]
}"""
    
    target_json_fields = """
    "logo": This will be a link to a logo of the event venue.",
    "venueAddress": "the full address, don't worry about cleaning it up, just extract it as is, e.g., "123 Main St, City, State, ZIP",
    "venueName": e.g., "The Fillmore",
    "description": This is the hardest one. It will be a brief description of the venue, can be multi-line text. If not found, use "N/A",
    """
    
    prompt = f"""You are an expert web scraper specializing in crawl4ai JsonCssExtractionStrategy creation. (docs: https://docs.crawl4ai.com/extraction/no-llm-strategies/)

EXAMPLE JsonCssExtractionStrategy schema:
{example_schema}

TASK:
Analyze the provided HTML and create a JsonCssExtractionStrategy that extracts data to match this JSON structure. It is crucial you verify that the CSS selectors you create will extract the correct data. Please ensure the selectors are accurate and will work with the provided HTML. JSON structure:
{{{target_json_fields}}}

REQUIREMENTS:
1. Use the example schema format above as your template
2. A field should be created for each of the json fields listed in the target structure
3. Identify the appropriate CSS selectors for each field, this will be probably an html element mixed with a class or id, e.g., "div.event-title > h3" DO NOT USE class names with hashed values, they are not stable. Use classes with names that are more stable, e.g., "div.event-title" instead of "div.sc-65dfe515-1". If no class is available, use element hierarchy e.g., "div > div > h3" 
4. For missing data, use "N/A" as the default value
5. Ensure proper selector types (text, attribute, etc.)
6. For times, often the same selector can be used for both start and end times, use regex to differentiate, ex: Sat Jun 1st 7:00 pm - 8:00 pm, the end time should be extracted as "8:00 pm"
7. Create a baseSelector that captures individual event/item containers

HTML TO ANALYZE:
{cleaned_html}

Please provide the complete JsonCssExtractionStrategy schema. DO NOT RETURN ANY OTHER TEXT OR COMMENTARY OUTSIDE THE JSON SCHEMA."""

    return prompt