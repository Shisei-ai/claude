cmake_minimum_required(VERSION 3.16)
project(roguelike)
set(CMAKE_CXX_STANDARD 17)

find_package(PkgConfig REQUIRED)
pkg_check_modules(SDL2 REQUIRED sdl2)
pkg_check_modules(SDL2_TTF REQUIRED SDL2_ttf)

file(GLOB SOURCES "src/*.cpp")
add_executable(roguelike ${SOURCES})

target_include_directories(roguelike PRIVATE ${SDL2_INCLUDE_DIRS} ${SDL2_TTF_INCLUDE_DIRS} src)
target_link_libraries(roguelike ${SDL2_LIBRARIES} ${SDL2_TTF_LIBRARIES})
target_compile_options(roguelike PRIVATE ${SDL2_CFLAGS_OTHER} ${SDL2_TTF_CFLAGS_OTHER})
