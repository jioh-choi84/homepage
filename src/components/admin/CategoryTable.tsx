'use client';

import Image from 'next/image';
import { Category } from '@/types/artwork';

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export default function CategoryTable({
  categories,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded border border-gray-200">
        <p className="text-gray-600">등록된 카테고리가 없습니다</p>
        <p className="text-gray-500 text-sm mt-1">
          새 카테고리를 추가해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              커버 이미지
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              이름
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              슬러그
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              설명
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
              관리
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {categories.map((category) => (
            <tr key={category.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="w-16 h-12 relative bg-gray-800 rounded overflow-hidden">
                  {category.cover_image_url ? (
                    <Image
                      src={category.cover_image_url}
                      alt={category.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">
                      {category.name.charAt(0)}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-900">{category.name}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-gray-600 text-sm">{category.slug}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-gray-600 text-sm line-clamp-1">
                  {category.description || '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(category)}
                  className="text-gray-600 hover:text-gray-900 text-sm mr-3"
                >
                  수정
                </button>
                <button
                  onClick={() => onDelete(category)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
