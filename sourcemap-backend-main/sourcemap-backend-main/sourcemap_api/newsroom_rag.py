import os
from typing import Any, Dict, List
from uuid import uuid4
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import pandas as pd
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

load_dotenv()


def clean_csv_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the DataFrame by filling missing values with appropriate defaults.
    """
    # Define default values for each column
    default_values = {
        'Title': 'No Title',
        'Description': 'No Description', 
        'Keywords': 'No Keywords',
        'Publisher': 'Unknown Publisher',
        'Date': 'Unknown Date',
        'Pg No.': '0',  # Default page number to 0 if missing
        'Link': 'No Link'
    }
    
    # Fill missing values
    for col, default_val in default_values.items():
        if col in df.columns:
            df[col] = df[col].fillna(default_val)
        else:
            # Add the column if it doesn't exist
            df[col] = default_val
            print(f"Warning: Column '{col}' not found in CSV, added with default value")
    
    return df


def load_csv_data(file_path: str) -> pd.DataFrame:
    """
    Load the CSV file and return a DataFrame.
    """
    df = pd.read_csv(file_path)
    print(f"Loaded {len(df)} records from {file_path}")
    
    # Clean the data to handle missing values
    df = clean_csv_data(df)
    print(f"After cleaning: {len(df)} records")
    
    return df


def create_documents_from_csv(df: pd.DataFrame) -> List[Document]:
    """
    Convert CSV data to LangChain Document format with metadata.
    """
    documents = []

    for index, row in df.iterrows():
        try:
            # Combine relevant text fields for embedding
            title = row.get('Title', 'No Title')
            description = row.get('Description', 'No Description')
            keywords = row.get('Keywords', 'No Keywords')
            
            content = f"Title: {title}\n\n"
            content += f"Description: {description}\n\n"
            content += f"Keywords: {keywords}"

            # Create metadata dictionary
            metadata = {
                "title": title,
                "publisher": row.get('Publisher', 'Unknown Publisher'),
                "description": description,
                "keywords": keywords,
                "date": str(row.get('Date', 'Unknown Date')),
                "page_number": str(row.get('Pg No.', '0')),
                "link": row.get('Link', 'No Link'),
                "source": "archivi.ng",
            }

            # Create and append Document
            doc = Document(page_content=content, metadata=metadata)
            documents.append(doc)
        except Exception as e:
            print(f"Error processing row {index}: {e}")
            continue

    return documents


def initialize_pinecone() -> Pinecone:
    """
    Initialize Pinecone with API key from environment variable.
    """
    pinecone_api_key = os.getenv("PINECONE_API_KEY")
    if not pinecone_api_key:
        raise ValueError("PINECONE_API_KEY environment variable not set")

    pc = Pinecone(api_key=pinecone_api_key)
    return pc


def store_in_pinecone(documents: List[Document], index_name: str, namespace: str = "newsroom"):
    """
    Store documents in Pinecone vector database using the updated Pinecone integration.
    """
    # Initialize embeddings
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",  # Use specific model
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

    # Initialize Pinecone client
    pc = initialize_pinecone()

    # Check if index exists, create if it doesn't
    if index_name not in pc.list_indexes().names():
        print(f"Creating Pinecone index: {index_name}")
        pc.create_index(
            name=index_name,
            dimension=1536,  # OpenAI embedding dimension
            metric="cosine",
            spec=ServerlessSpec(
                cloud='aws',
                region='us-east-1'  # Adjust region as needed
            )
        )
        print(f"Index {index_name} created successfully")
    else:
        print(f"Index {index_name} already exists")

    # Create PineconeVectorStore and add documents using the new approach
    vector_store = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings,
        namespace=namespace  # Use namespace to organize data
    )

    # Generate unique IDs for documents
    uuids = [str(uuid4()) for _ in range(len(documents))]

    print(f"Storing {len(documents)} documents in Pinecone...")
    vector_store.add_documents(documents=documents, ids=uuids)
    print(
        f"Successfully stored {len(documents)} documents in Pinecone index: {index_name} with namespace: {namespace}"
    )


def search_pinecone(
    index_name: str, query: str, top_k: int = 5, namespace: str = "newsroom"
) -> List[Dict[str, Any]]:
    """
    Perform similarity search in Pinecone vector database using the updated integration.
    """
    # Initialize embeddings
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",  # Use specific model
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

    # Create PineconeVectorStore with the same namespace
    vector_store = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings,
        namespace=namespace  # Use the same namespace
    )

    # Perform similarity search
    results = vector_store.similarity_search_with_score(query, k=top_k)

    # Format results
    formatted_results = []
    for doc, score in results:
        formatted_results.append(
            {
                "content": doc.page_content,
                "metadata": doc.metadata,
                "similarity_score": score,
            }
        )

    return formatted_results


def main():
    """
    Main function to run the newsroom RAG pipeline.
    """
    print("Starting newsroom RAG pipeline...")

    # File path to the CSV
    csv_file_path = "data/archivi.csv"

    # Index name for Pinecone
    index_name = "archivi"

    # Load data from CSV
    df = load_csv_data(csv_file_path)
    
    df = df.iloc[3001:]
    
    df = df.fillna(" ")

    # Create documents from CSV data
    documents = create_documents_from_csv(df)

    # Store documents in Pinecone
    store_in_pinecone(documents, index_name)

    print("Pipeline completed successfully!")

    # Example search to test
    print("\nTesting search functionality...")
    sample_results = search_pinecone(
        index_name, "historical figures in Nigeria", top_k=2
    )

    if sample_results:
        print(
            f"Found {len(sample_results)} results for 'historical figures in Nigeria':"
        )
        for i, result in enumerate(sample_results, 1):
            print(f"\nResult {i}:")
            print(f"Title: {result['metadata']['title']}")
            print(f"Publisher: {result['metadata']['publisher']}")
            print(f"Similarity Score: {result['similarity_score']:.3f}")
            print(f"Description: {result['metadata']['description'][:100]}...")
    else:
        print("No results found for the test query.")


if __name__ == "__main__":
    main()
