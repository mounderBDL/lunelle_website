package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categories;
    private final ProductRepository products;

    @Transactional(readOnly = true)
    public List<PublicCategoryDto> listPublic() {
        return categories.findByActiveTrueOrderBySortOrderAscNameEnAsc().stream()
                .map(CatalogMapper::publicCategory)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> listAdmin() {
        return categories.findAllByOrderBySortOrderAscNameEnAsc().stream()
                .map(CatalogMapper::category)
                .toList();
    }

    @Transactional
    public CategoryDto create(CategoryRequest r) {
        Category c = new Category();
        c.setSlug(TextUtil.uniqueSlug(r.name().en(), categories::existsBySlug));
        apply(c, r);
        return CatalogMapper.category(categories.save(c));
    }

    @Transactional
    public CategoryDto update(UUID id, CategoryRequest r) {
        Category c = categories.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown category"));
        apply(c, r);
        return CatalogMapper.category(c);
    }

    @Transactional
    public void delete(UUID id) {
        if (!categories.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown category");
        }
        if (products.existsByCategoryId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This category still has products. Move or archive them first.");
        }
        categories.deleteById(id);
    }

    private void apply(Category c, CategoryRequest r) {
        c.setNameEn(r.name().en().trim());
        c.setNameFr(r.name().fr().trim());
        c.setDescriptionEn(r.description() == null ? null : TextUtil.blankToNull(r.description().en()));
        c.setDescriptionFr(r.description() == null ? null : TextUtil.blankToNull(r.description().fr()));
        c.setImageUrl(TextUtil.blankToNull(r.imageUrl()));
        c.setSortOrder(r.sortOrder());
        c.setActive(r.active());
    }
}