import { isEqual } from '../../../shared/lib/utils';

export class Vector2 {
    static ZERO = {
        x: 0, y: 0, z: 0
    };

    static add(v1, v2) {
        return {
            x: v1.x + v2.x,
            y: v1.y + v2.y
        };
    }

    static sub(v1, v2) {
        return {
            x: v1.x - v2.x,
            y: v1.y - v2.y
        };
    }

    static isZero(v) {
        return Vector2.isEqual(v, Vector2.ZERO);
    }

    static isEqual(v0, v1) {
        return isEqual(v0.x, v1.x) && isEqual(v0.y, v1.y);
    }

    static length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    static length2(v) {
        return v.x * v.x + v.y * v.y;
    }

    static cross(v1, v2) {
        return v1.x * v2.y - v1.y * v2.x;
    }

    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }

    static normalize(v) {
        const length = Vector2.length(v);
        return {
            x: v.x / length,
            y: v.y / length
        };
    }

    static testLength(v, len) {
        if (v.x > len || v.x < -len) return false;
        if (v.y > len || v.y < -len) return false;
        return Vector2.length2(v) <= len * len;
    }

    static sameSide(v1, v2, p1, p2) {
        const c1 = Vector2.cross(Vector2.sub(v2, v1), Vector2.sub(p1, v1));
        const c2 = Vector2.cross(Vector2.sub(v2, v1), Vector2.sub(p2, v1));
        return (c1 >= 0 && c2 >= 0) || (c1 <= 0 && c2 <= 0);
    }
}