import React, { useState, useRef, useLayoutEffect, memo } from "react";
import { useWindowSize } from "react-use";
import styled from "styled-components";
import { vscode } from "../../utils/vscode";
import { glassEffect } from "../../styles/glassmorphism";

interface ThumbnailsProps {
  images: string[];
  style?: React.CSSProperties;
  setImages?: React.Dispatch<React.SetStateAction<string[]>>;
  onHeightChange?: (height: number) => void;
}

const ThumbnailsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  row-gap: 5px;
`;

const ThumbnailWrapper = styled.div`
  position: relative;
  
  &:hover .thumbnail-delete {
    opacity: 1;
  }
`;

const Thumbnail = styled.img`
  width: 34px;
  height: 34px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const DeleteButton = styled.div`
  ${glassEffect()}
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background: color-mix(in srgb, var(--vscode-badge-background) 85%, transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 2;
  
  span {
    color: var(--vscode-foreground);
    font-size: 10px;
    font-weight: bold;
  }
`;

const Thumbnails = ({ images, style, setImages, onHeightChange }: ThumbnailsProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useWindowSize();

  useLayoutEffect(() => {
    if (containerRef.current) {
      let height = containerRef.current.clientHeight;
      // some browsers return 0 for clientHeight
      if (!height) {
        height = containerRef.current.getBoundingClientRect().height;
      }
      onHeightChange?.(height);
    }
    setHoveredIndex(null);
  }, [images, width, onHeightChange]);

  const handleDelete = (index: number) => {
    setImages?.((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const isDeletable = setImages !== undefined;

  const handleImageClick = (image: string) => {
    vscode.postMessage({ type: "openImage", text: image });
  };

  return (
    <ThumbnailsContainer ref={containerRef} style={style}>
      {images.map((image, index) => (
        <ThumbnailWrapper
          key={index}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}>
          <Thumbnail
            src={image}
            alt={`Thumbnail ${index + 1}`}
            onClick={() => handleImageClick(image)}
          />
          {isDeletable && (
            <DeleteButton
              className="thumbnail-delete"
              onClick={() => handleDelete(index)}>
              <span className="codicon codicon-close"></span>
            </DeleteButton>
          )}
        </ThumbnailWrapper>
      ))}
    </ThumbnailsContainer>
  );
};

export default memo(Thumbnails);
