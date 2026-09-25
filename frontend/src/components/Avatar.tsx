import { useEffect, useState } from 'react';
import './Avatar.css';

interface AvatarProps {
    src?: string | null;
    size: number;
    alt?: string;
    className?: string;
}

export function Avatar({ src, size, alt = '', className = '' }: AvatarProps) {
    const [failed, setFailed] = useState(false);

    // If the URL changes (re-upload bumps ?v=, or it goes back to null),
    // give the new one a fresh chance instead of staying stuck on failed.
    useEffect(() => {
        setFailed(false);
    }, [src]);

    const showImage = Boolean(src) && !failed;

    return (
        <div
            className={`avatar${className ? ` ${className}` : ''}`}
            style={{ width: size, height: size }}
        >
            {showImage && (
                <img
                    src={src ?? undefined}
                    alt={alt}
                    className="avatar-image"
                    onError={() => setFailed(true)}
                />
            )}
        </div>
    );
}
